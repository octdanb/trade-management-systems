---
name: deploy
description: Deploy the app to the Nomad server (Traefik-routed) via GitHub Actions or the nomad CLI, and debug deployments. Use when asked to deploy, ship to production, roll back, or diagnose the running deployment.
---

# Deploying to Nomad

Full reference: `deploy/README.md`. Job spec: `deploy/mow.nomad.hcl`
(Postgres + MinIO + backend + frontend in one job, Traefik tags on the
`mow` and `mow-minio` services).

## Deploy paths

1. **Release (normal)**: push a `release/X.Y.Z` branch → CI builds images,
   publishes a GitHub Release → the `Deploy` workflow runs `nomad job run`
   with `image_tag=X.Y.Z` and waits for a healthy deployment.
2. **Manual**: Actions → Deploy → Run workflow → any image tag
   (`1.2.0`, a branch tag like `main`, or `sha-xxxxxxx`).
3. **CLI**: `nomad job run -var image_tag=... -var domain=... -var media_domain=... deploy/mow.nomad.hcl`
   with `NOMAD_ADDR`/`NOMAD_TOKEN` set.

## Config lives in

- GitHub environment `production`: secrets `NOMAD_ADDR`, `NOMAD_TOKEN`;
  variables `APP_DOMAIN`, `MEDIA_DOMAIN`.
- Nomad variable `nomad/jobs/mow`: django_secret_key, db_password,
  minio_root_user/password, google_oauth_client_id/secret,
  geocoder_user_agent. Update with `nomad var put` — tasks restart on change.

## Debugging a deployment

```sh
nomad job status mow                       # deployment + alloc health
nomad deployment status <id>               # why a rollout failed
nomad alloc status <alloc>                 # placement/ports/checks
nomad alloc logs -task backend <alloc>     # Django/gunicorn logs
nomad alloc logs -task create-bucket <alloc>  # MinIO bucket init
```

Common failures:
- **Image pull errors**: GHCR package not public and no registry creds on
  the client.
- **Template error `nomad/jobs/mow` missing key**: a secret wasn't set —
  `nomad var get nomad/jobs/mow` to inspect.
- **Frontend healthy, API 502**: backend task crashed — check its logs;
  migrations run before gunicorn, so bad DB creds surface there.
- **No route / 404 from Traefik**: Traefik Nomad provider not enabled, or
  entrypoint/certresolver names don't match — pass
  `-var traefik_entrypoint=... -var traefik_certresolver=...`.

## Rollbacks

Deployments auto-revert on failed health checks. To roll back manually,
re-run the Deploy workflow with the previous version's image tag.
