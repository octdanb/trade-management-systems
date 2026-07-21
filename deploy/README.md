# Deploying to Nomad (with Traefik)

Everything deploys as one Nomad job (`mow.nomad.hcl`): Postgres, MinIO,
Django backend and the nginx frontend. Traefik routes two hostnames:

- `https://<APP_DOMAIN>` → frontend nginx (which proxies API routes to the
  backend over the group-local network)
- `https://<MEDIA_DOMAIN>` → MinIO (public-download `media` bucket; photo
  URLs the API returns point here)

GitHub Actions (`.github/workflows/deploy.yml`) deploys automatically when a
release is published — i.e. the `release/X.Y.Z` branch flow ends with that
version live — and on demand via *Run workflow* with any image tag.

## One-time server setup

### 1. Host volumes (Nomad client config)

```hcl
client {
  host_volume "mow-pgdata" {
    path = "/opt/mow/pgdata"
  }
  host_volume "mow-minio" {
    path = "/opt/mow/minio"
  }
}
```

Create the directories, then restart the Nomad client.

### 2. Traefik

The job publishes services with the **Nomad provider** tags. Traefik needs:

```yaml
providers:
  nomad:
    endpoint:
      address: http://127.0.0.1:4646
      # token: <traefik ACL token>   # if ACLs are enabled
    exposedByDefault: false
```

(If your Traefik watches the Consul catalog instead, change
`provider = "nomad"` to `"consul"` in the three `service` blocks.)

DNS for both hostnames must point at the Traefik box. Entrypoint/certresolver
names default to `websecure`/`letsencrypt` — override with
`-var traefik_entrypoint=... -var traefik_certresolver=...` if yours differ.

### 3. Secrets (Nomad variables)

```sh
nomad var put nomad/jobs/mow \
  django_secret_key="$(openssl rand -base64 48)" \
  db_password="$(openssl rand -hex 24)" \
  minio_root_user=mow-media \
  minio_root_password="$(openssl rand -hex 24)" \
  google_oauth_client_id=... \
  google_oauth_client_secret=... \
  geocoder_user_agent="mow/1.0 (you@example.com)"
```

All keys are required (templates fail closed if missing). For Google OAuth,
register `https://<APP_DOMAIN>/accounts/google/login/callback/` as the
redirect URI.

### 4. GHCR access

The workflow deploys images from `ghcr.io/octdanb/trade-management-systems/*`.
Easiest: make both packages **public** (GitHub → Packages → package →
settings → Change visibility). For private packages, configure registry
credentials on the Nomad client instead (docker driver `auth` in the task
config, or a credential helper on the host).

### 5. GitHub → Nomad connectivity

Create a **production** environment in the repo (Settings → Environments)
with:

- secret `NOMAD_ADDR` — e.g. `https://nomad.example.com` (put the API behind
  Traefik with TLS, protected by ACLs)
- secret `NOMAD_TOKEN` — an ACL token whose policy allows `submit-job` on the
  default namespace and `read` on the `nomad/jobs/mow` variable path:

  ```hcl
  namespace "default" {
    policy       = "write"
    capabilities = ["submit-job", "read-job", "list-jobs"]
  }
  ```

- variables `APP_DOMAIN` and `MEDIA_DOMAIN`

If the Nomad API isn't internet-reachable, uncomment the Tailscale step in
the workflow or use a self-hosted runner.

## Deploying

- **Release flow (normal)**: push `release/X.Y.Z` → CI builds images tagged
  `X.Y.Z`, publishes the GitHub Release → the Deploy workflow ships it.
- **Manual**: Actions → Deploy → *Run workflow* → any image tag (a version,
  a branch name like `main`, or `sha-xxxxxxx`).
- **From your machine**:

  ```sh
  NOMAD_ADDR=... NOMAD_TOKEN=... nomad job run \
    -var image_tag=1.2.0 -var domain=mow.example.com \
    -var media_domain=media.mow.example.com deploy/mow.nomad.hcl
  ```

Deployments are rolling with `auto_revert = true` — a failed health check
rolls back to the previous version. Django migrations run automatically
before gunicorn starts (single-instance app, so no migration races).

## Operations cheatsheet

```sh
nomad job status mow                 # allocations + deployment state
nomad alloc logs -task backend <id>  # Django logs (incl. mock-push lines)
nomad alloc exec -task backend <id> python manage.py createsuperuser
nomad alloc exec -task backend <id> python manage.py send_due_reminders
```

Schedule the daily reminders by adding a small `periodic` batch job, or a
cron on the host that runs the `nomad alloc exec ... send_due_reminders`
line above.
