# Trade Management Systems

A scheduling and route-planning app for solo service businesses — first use
case: a lawn mowing round. Manage clients (contacts, address, per-visit rate &
cost, notes), schedule one-off or repeating visits, track each job
(done/skipped, price, paid), and plan each day's driving route in the best
order.

## Features

- **Clients** — contact details, address, notes, per-visit rate and cost,
  active/inactive. Addresses are geocoded automatically (Nominatim/OSM).
- **Schedule** — month/week calendar (FullCalendar). Click a day to add a
  one-off visit or a repeating series (weekly / fortnightly / every 3 or 4
  weeks). Drag visits to reschedule. Series edits apply "this date onward"
  and never touch completed or individually-moved visits.
- **Today** — the day's route as an ordered stop list. One tap to optimize
  the order by driving time (OSRM + nearest-neighbor/2-opt, straight-line
  fallback when offline), manual re-ordering, per-stop done/skip/paid, day
  revenue totals, and an "Open in Google Maps" link for turn-by-turn.
- **Tools & equipment** — mowers, trimmers, trailers with photos, serial
  numbers, purchase dates, notes, and a servicing contact (who to call).
  Set a service interval and log services; the app computes when the next
  one is due.
- **Reminders & notifications** — equipment due (or overdue) for service
  surfaces in the in-app notification bell and through a mocked push
  pipeline: `core/services/notifications.send_push` writes to a
  Notification outbox and logs what a real push would send. The future
  React Native app registers its FCM/APNs token via `POST /api/devices`;
  only the transport inside `send_push` needs wiring up. Run
  `manage.py send_due_reminders` daily (cron) to generate reminders, or
  use the bell's "Check now" button.
- **Settings** — business name and home address (route start point), plus
  account management: change/set password, email verification status with
  resend, and Google account connect/disconnect.
- **Auth flows** — email+password registration with verification emails
  (optional-but-nagging by default; set `ACCOUNT_EMAIL_VERIFICATION=mandatory`
  to block unverified logins), forgot/reset password, and Google social
  login. Social-only accounts can set a password later; accounts can link
  and unlink Google in Settings.

Tech stack:

| Layer    | Stack                                                                 |
| -------- | --------------------------------------------------------------------- |
| Backend  | Django 5 + [django-ninja](https://django-ninja.dev) API, Postgres — deps via [uv](https://docs.astral.sh/uv/), lint/format via [ruff](https://docs.astral.sh/ruff/) |
| Auth     | [django-allauth](https://allauth.org) (headless) — email registration + Google login; session cookies on the web, Bearer access tokens for mobile |
| Frontend | Vite + React + TypeScript, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) — [pnpm](https://pnpm.io) + [Biome](https://biomejs.dev) |
| Mobile   | [Expo](https://expo.dev) (SDK 57) + expo-router + [NativeWind](https://www.nativewind.dev) in `mobile/` — pnpm + Biome |
| API client | [kubb](https://kubb.dev) generates an axios client + [TanStack Query](https://tanstack.com/query) hooks from the ninja OpenAPI schema |
| Dev      | docker compose orchestrated via a [justfile](https://github.com/casey/just) |
| CI       | GitHub Actions: lint/typecheck, then build + push prod images to GHCR |

## Quick start

Prereqs: [docker](https://docs.docker.com/get-docker/) and [just](https://github.com/casey/just#installation).

```sh
cp .env.example .env   # add Google OAuth creds if you want social login
just dev
```

- App: <http://localhost:5173> (Vite dev server, HMR)
- API docs: <http://localhost:5173/api/docs> (django-ninja Swagger UI)
- Django admin: <http://localhost:5173/admin/> (`just superuser` to create a login)

The Vite dev server proxies `/api`, `/_allauth`, `/accounts`, `/admin` and
`/static` to Django, so the browser only ever talks to one origin — auth is
plain Django session cookies, no CORS or token juggling.

## Everyday commands

```sh
just dev              # start the stack (db + backend + frontend)
just logs backend     # tail logs
just manage <cmd>     # any manage.py command
just makemigrations   # after model changes
just migrate
just codegen          # regenerate frontend/src/gen from the ninja schema
just test             # backend test suite (occurrences, routing, API isolation)
just lint             # ruff + tsc
just nuke             # stop and wipe volumes
```

## API workflow (kubb)

1. Add/modify endpoints in `backend/core/api.py` (give each an `operation_id` —
   it becomes the hook name, e.g. `listTrades` → `useListTrades`).
2. `just codegen` — exports `frontend/openapi.json` and regenerates
   `frontend/src/gen/` (types, axios clients, TanStack Query hooks).
3. Import from `@/gen` in components.

The generated code is committed so the frontend builds without a running
backend (e.g. in CI).

## Scheduling model

Repeating appointments are an `AppointmentSeries` (client, frequency, start
date, optional time/end date). Occurrences are materialized lazily into `Job`
rows — on series create/edit out to ~90 days, and further whenever the
schedule asks for a later range. Each `Job` carries its own status
(scheduled/completed/skipped/cancelled), price (snapshotted from the client's
rate, overridable), paid flag and notes, so history is never lost:

- Dragging a visit moves that occurrence only (`modified=True` protects it
  from series regeneration; `original_date` prevents duplicates).
- "Edit series from this date" regenerates only future scheduled, untouched
  occurrences.
- Ending a series keeps everything on/before the end date.

## Photo storage (S3-compatible)

Uploaded photos are stored in an S3-compatible object store via
django-storages. Local dev runs [MinIO](https://min.io) inside docker compose
(`just dev` starts it, creates the `media` bucket, and makes it
public-download; console at <http://localhost:9001>, login
`minioadmin`/`minioadmin`). Django talks to `minio:9000` inside the compose
network while browsers fetch image URLs from `localhost:9000` — that split is
the `AWS_S3_ENDPOINT_URL` vs `AWS_S3_CUSTOM_DOMAIN` settings.

In production point the same env vars at AWS S3 / Cloudflare R2 / Spaces (see
`.env.example`): either a public bucket behind a CDN (`AWS_S3_CUSTOM_DOMAIN`)
or a private bucket with signed expiring URLs (`AWS_QUERYSTRING_AUTH=true`).
Set `USE_S3_MEDIA=false` to fall back to local-disk media (the Django dev
server then serves `/media/` itself).

## Emails in development

The dev stack uses Django's console email backend: verification and
password-reset emails are printed to the backend logs (`just logs backend`)
instead of being sent. Click the link straight from the log output. Set
`DJANGO_EMAIL_BACKEND` + SMTP env vars for real delivery.

## Geocoding & routing

Client addresses are geocoded on save via **Nominatim** (OpenStreetMap's free
geocoder — set `GEOCODER_USER_AGENT` in `.env`, their policy requires an
identifying UA with contact info). Route optimization fetches a driving-time
matrix from the public **OSRM** server and orders the day's stops with
nearest-neighbor + 2-opt, starting from your home address (Settings). If OSRM
is unreachable it falls back to straight-line distances so the button always
works. Both service URLs are env-overridable (`NOMINATIM_URL`, `OSRM_URL`)
if you later self-host or usage outgrows the public servers' fair-use
policies. Geocoding failures never block saving a client — the visit just
shows in the "no location" list until the address is fixed.

## Auth

Email/password registration and login go through allauth's headless JSON API;
the web UI lives in `frontend/src/pages/login.tsx` and `signup.tsx`.

Two auth transports share the same user accounts:

- **Web** (`/_allauth/browser/v1/...`): plain Django session cookies + CSRF —
  same-origin via the Vite/nginx proxy.
- **Mobile** (`/_allauth/app/v1/...`): token-based. Auth responses return a
  `session_token` (drives further allauth calls via `X-Session-Token`) and an
  **access token** (`meta.access_token`) sent to `/api/*` as
  `Authorization: Bearer …`. Access tokens are stateless signed payloads
  (`backend/core/auth.py`), TTL `ACCESS_TOKEN_TTL_DAYS` (default 14). The
  ninja API accepts either transport.

## Mobile app (`mobile/`)

Expo (SDK 57) + expo-router + NativeWind + TanStack Query, tokens stored in
expo-secure-store. Run it against the local backend:

```sh
cd mobile
pnpm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000 pnpm start
```

then open in Expo Go / a simulator. `pnpm lint` (Biome) and `pnpm typecheck`
mirror CI.

The mobile app replicates the webapp (minus the marketing pages): Today
(route optimization, reorder, done/skip/paid, Google Maps handoff), Schedule
(agenda with one-off/repeating creation and per-visit editing), Clients
(search/create/edit, series management, geocode retry), Equipment (photos via
the camera roll, service logging, tap-to-call servicing contact), Settings
(business/home base, change password, sign out) and Notifications (reminders
+ check-now). Screens live in `mobile/app/` (file-based routing); the typed
API hooks in `mobile/src/gen/` are kubb-generated from the same OpenAPI
schema as the web app (`just codegen` regenerates both).

### Google login

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** (type: Web application) with:
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173/accounts/google/login/callback/`
2. Put the client ID/secret in `.env` (see `.env.example`) and restart the stack.

A Google sign-in with a new email auto-creates the account
(`EMAIL_AUTHENTICATION = True`), and one matching an existing email links to it.

## CI / versioning / releases

`.github/workflows/ci.yml` runs on every branch push: lint + tests for both
apps, then Docker builds of the production images (multi-stage `prod`
targets), pushed to GHCR:

- `ghcr.io/<owner>/<repo>/backend` — gunicorn + whitenoise
- `ghcr.io/<owner>/<repo>/frontend` — nginx serving the built SPA, proxying
  API routes to `$BACKEND_ORIGIN`

A separate `Audit` workflow runs dependency-vulnerability scans on every push
and weekly: `pip-audit` over the locked backend dependencies (PyPA advisory
DB) and `pnpm audit --prod --audit-level high` for the frontend and mobile
apps. It's deliberately not a gate for image builds — a red audit means "bump
that dependency", not "the build is broken".

Image tags are driven by the git ref:

| You push…                  | Images get tagged…                            |
| -------------------------- | --------------------------------------------- |
| any branch                 | `<branch-name>` (slashes → dashes), `sha-<short>` |
| the default branch         | additionally `latest`                          |
| a branch `release/X.Y.Z`   | additionally `X.Y.Z`, plus CI creates git tag `vX.Y.Z` and a **GitHub Release** with generated notes |
| a tag `vX.Y.Z` directly    | `X.Y.Z`                                        |

So cutting a release is: `git checkout -b release/1.2.0 && git push -u origin
release/1.2.0`. The release job is idempotent — re-pushing the branch after a
fix won't duplicate the release (delete the release + tag first to re-cut).

## Android beta distribution

The **Mobile Build** workflow (Actions → Mobile Build → Run workflow, and
automatically on every release) compiles the Android APK with expo prebuild +
gradle on the CI runner, then:

- publishes it to the backend (`POST /api/app/builds`, guarded by the
  `APP_BUILD_UPLOAD_TOKEN` shared secret; APKs live in the same S3/MinIO
  media storage as photos),
- attaches it to the GitHub release,
- keeps it as a workflow artifact.

`GET /api/app/latest?platform=android` (public) reports the newest version;
the landing page shows a "Download for Android" button whenever a build
exists, and the mobile app compares its own versionCode against it, showing
an in-app "Update available" banner that downloads the new APK. versionCode
is the CI run number, so it's always increasing; the human version comes from
the release tag (or mobile/app.json for manual runs). Builds can also be
uploaded manually through the Django admin.

## Deployment (Nomad + Traefik)

Publishing a release automatically deploys it: the `Deploy` workflow runs
`nomad job run` against your Nomad server with the released image tag and
waits for a healthy rolling deployment (auto-revert on failure). The job
(`deploy/mow.nomad.hcl`) runs Postgres, MinIO, the backend and the frontend,
with Traefik routing `https://<APP_DOMAIN>` to the app and
`https://<MEDIA_DOMAIN>` to photo storage. One-time server setup (host
volumes, Traefik provider, secrets via `nomad var put`, GitHub environment
config) is documented in [deploy/README.md](deploy/README.md). Manual deploys:
Actions → Deploy → Run workflow with any image tag.

Production env vars the backend expects: `DJANGO_SECRET_KEY`,
`DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`,
`DATABASE_URL`, `FRONTEND_URL`, `GOOGLE_OAUTH_CLIENT_ID`,
`GOOGLE_OAUTH_CLIENT_SECRET`.

## Layout

```
backend/
  config/            # settings, urls, ninja API mount
  core/
    models.py        # BusinessProfile, Client, AppointmentSeries, Job
    api*.py          # routers: clients/profile, series/jobs, route planning
    services/        # occurrences (recurrence), geocode (Nominatim), routing (OSRM + 2-opt)
    tests/           # occurrence semantics, routing heuristics, API isolation
frontend/
  src/gen/           # kubb-generated API client + hooks (committed)
  src/lib/           # axios/kubb client, allauth client, maps links
  src/hooks/         # useSession/useLogin/useSignup/useLogout
  src/pages/         # login, signup, today (route), schedule (calendar), clients, settings
  src/components/    # app layout, job/series/client forms, shadcn ui/
docker-compose.yml   # local dev stack
justfile             # task runner
```
