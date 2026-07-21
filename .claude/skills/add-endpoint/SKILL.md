---
name: add-endpoint
description: Add a django-ninja API endpoint end-to-end — schema, router, codegen, frontend hook, tests. Use whenever adding or changing backend API surface (new resource, new field, new action).
---

# Add or change an API endpoint

Follow this loop for any API surface change. The frontend client is
GENERATED — never hand-edit `frontend/src/gen/`.

## 1. Backend

1. Models in `backend/core/models.py` (if needed), then
   `just manage makemigrations`.
   - `TextChoices` classes used in schemas need globally unique class names
     (`JobStatus`, not `Status`) or OpenAPI components silently collide.
2. Schemas in `backend/core/schemas.py` (ninja `Schema` classes, `In`/`Out`
   suffix convention).
3. Endpoint in the matching router module: `api_clients.py`,
   `api_schedule.py`, `api_route.py`, `api_equipment.py`,
   `api_notifications.py` — or a new `api_<domain>.py` mounted in
   `backend/config/api.py`.
   - **Always** scope queries by the session user:
     `Model.objects.filter(user=request.auth)` / `get_object_or_404(..., user=request.auth)`.
   - **Always** set a camelCase `operation_id` — it becomes the frontend hook
     name (`listTrades` → `useListTrades`).
   - Business logic that isn't trivial goes in `backend/core/services/`, not
     in the view.

## 2. Tests (backend/core/tests/)

- Happy path + a cross-user isolation case (login as `other`, expect 404/[]).
  Copy the pattern in `test_api.py`.
- Run: `just test` (or `cd backend && uv run python manage.py test core`).

## 3. Codegen

```sh
just codegen   # exports openapi.json, regenerates frontend/src/gen
```

## 4. Frontend

- Import hooks/types from `@/gen`. Query keys: `<opId>QueryKey(...)`;
  for invalidating every param-variant of a list use the base keys in
  `src/lib/query-keys.ts` (add one for new list endpoints).
- Decimals are typed `number | string` — send strings from forms.
- Mutations: invalidate affected query keys in `onSuccess`.
- Verify: `cd frontend && npx tsc -b` (or `npm run build`).

## 5. Before committing

`just lint` and `just test` green; commit the regenerated `src/gen` together
with the backend change (CI builds the frontend from committed codegen).
