---
name: codegen
description: Regenerate the typed API client (kubb) from the django-ninja OpenAPI schema, and troubleshoot generation issues. Use after any backend schema/endpoint change or when frontend types look stale.
---

# API client codegen

## Normal flow

```sh
just codegen
```

This runs two steps (see justfile):
1. `manage.py export_openapi_schema --api config.api.api` → `frontend/openapi.json`
2. `npx kubb generate` (config: `frontend/kubb.config.ts`) → `frontend/src/gen/`
   (types + axios clients + TanStack Query hooks; directory is cleaned each run)

Without docker: run step 1 with `cd backend && uv run python manage.py
export_openapi_schema --api config.api.api --output ../frontend/openapi.json`,
then `cd frontend && npx kubb generate`.

`frontend/src/gen/` and `frontend/openapi.json` are **committed** — the
frontend must build in CI without a running backend.

## How pieces map

| Backend                          | Generated                             |
| -------------------------------- | ------------------------------------- |
| `operation_id="listTrades"`      | `useListTrades`, `listTradesQueryKey` |
| path/query params                | positional args / `params` object     |
| `TextChoices` class `JobStatus`  | `jobStatusEnum` const + `JobStatus` type |
| Decimal fields                   | `number \| string` (send strings)     |

All generated code imports the custom axios client at
`frontend/src/lib/kubb-client.ts` (session cookies + CSRF header). It must
keep exporting `client` (default), `RequestConfig`, `ResponseConfig`,
`ResponseErrorConfig`, and `Client`.

## Known gotchas

- **Enum name collisions**: two `TextChoices` classes with the same class
  name produce ONE OpenAPI component — the second silently overwrites the
  first. Unique class names (`JobStatus`, `EquipmentStatus`).
- **File uploads**: kubb's generated JSON client isn't used for multipart —
  post `FormData` via `axiosInstance` directly (see the photo upload in
  `src/pages/equipment-detail.tsx`).
- After codegen, always `npx tsc -b` in frontend — renamed operation_ids or
  types surface as compile errors that must be fixed in the same change.
