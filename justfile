# Local development is dockerized: `just dev` is all you need.

set dotenv-load := true

# List available recipes
default:
    @just --list

# Start the full dev stack (Django + Vite + Postgres)
dev:
    docker compose up --build

# Stop the stack
down:
    docker compose down

# Stop the stack and wipe volumes (Postgres data, caches)
nuke:
    docker compose down -v

# Tail logs (optionally for one service: `just logs backend`)
logs *service:
    docker compose logs -f {{service}}

# Run a Django management command, e.g. `just manage createsuperuser`
manage *args:
    docker compose run --rm backend uv run python manage.py {{args}}

# Apply database migrations
migrate:
    just manage migrate

# Create migrations from model changes
makemigrations *args:
    just manage makemigrations {{args}}

# Create a Django admin superuser
superuser:
    just manage createsuperuser

# Open a shell in the backend container
backend-shell:
    docker compose run --rm backend bash

# Open a shell in the frontend container
frontend-shell:
    docker compose run --rm frontend bash

# Export the django-ninja OpenAPI schema to frontend/openapi.json
schema:
    docker compose run --rm backend uv run python manage.py export_openapi_schema --api config.api.api --output /app/openapi.json
    mv backend/openapi.json frontend/openapi.json

# Regenerate the typed API client + TanStack Query hooks (schema + kubb)
codegen: schema
    docker compose run --rm frontend pnpm exec kubb generate

# Run the backend test suite
test:
    docker compose run --rm backend uv run python manage.py test core

# Lint backend (ruff) and typecheck/build frontend
lint:
    docker compose run --rm backend uv run ruff check .
    docker compose run --rm backend uv run ruff format --check .
    docker compose run --rm frontend pnpm lint
    docker compose run --rm frontend pnpm exec tsc -b

# Run Django system checks and verify migrations are up to date
check:
    just manage check
    just manage makemigrations --check --dry-run
