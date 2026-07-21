---
name: dev-stack
description: Run and debug the local docker-compose dev stack (Django, Vite, Postgres, MinIO) — service URLs, logs, common failure modes, seeding data. Use when starting the app, diagnosing dev-environment issues, or finding where things run.
---

# Local dev stack

`just dev` runs everything. Service map:

| Service  | URL                        | Notes                                   |
| -------- | -------------------------- | --------------------------------------- |
| App      | http://localhost:5173      | Vite dev server (proxies to Django)     |
| API docs | http://localhost:5173/api/docs | ninja Swagger UI (needs login session) |
| Admin    | http://localhost:5173/admin/ | `just superuser` to create a login     |
| Postgres | localhost:5432             | `app`/`app`, db `app`                   |
| MinIO    | localhost:9000 (console :9001) | `minioadmin`/`minioadmin`, bucket `media` |

Useful: `just logs [service]`, `just backend-shell`, `just manage <cmd>`,
`just nuke` (wipe volumes/db), `just test`, `just lint`, `just codegen`.

## Where things show up in dev

- **Emails** (verification, password reset): printed to backend logs
  (console email backend). `just logs backend` and click the link.
- **Mock push notifications**: rows in the `Notification` table + backend
  log lines `[mock push] ...`; visible in the app's bell menu.
- **Uploaded photos**: MinIO bucket `media` (browse via console :9001).

## Common failure modes

- **Photo upload 500 / images broken**: MinIO not healthy or bucket missing —
  check `just logs minio minio-init`; `just nuke && just dev` re-creates the
  bucket. Browser fetches images from `localhost:9000` — the port must be free.
- **Geocoding always "failed"**: no outbound internet, or
  `GEOCODER_USER_AGENT` unset (Nominatim rejects anonymous UAs). Set it in
  `.env`. Route optimization still works via haversine fallback.
- **Google login error**: `GOOGLE_OAUTH_CLIENT_ID/SECRET` missing from `.env`
  or the redirect URI `http://localhost:5173/accounts/google/login/callback/`
  not registered in Google Cloud Console.
- **Frontend type errors mentioning `@/gen`**: stale codegen — `just codegen`.
- **`relation ... does not exist`**: migrations pending — `just migrate`
  (the backend container also migrates on start).

## Seed data quickly

```sh
just manage shell
```

Then create a user/clients/series via the ORM, or sign up through the UI at
http://localhost:5173/signup (email verification is optional in dev).
