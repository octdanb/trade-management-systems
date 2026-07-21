# Nomad job for the full stack: Postgres, MinIO, Django backend + nginx
# frontend, routed by Traefik. Deployed from GitHub Actions
# (.github/workflows/deploy.yml) with:
#
#   nomad job run -var image_tag=X.Y.Z -var domain=... -var media_domain=... deploy/mow.nomad.hcl
#
# Server prerequisites (see deploy/README.md):
#   - host volumes "mow-pgdata" and "mow-minio" in the client config
#   - Traefik with the Nomad provider (or Consul catalog) enabled
#   - secrets stored once via:  nomad var put nomad/jobs/mow \
#       django_secret_key=... db_password=... minio_root_user=... \
#       minio_root_password=... google_oauth_client_id=... \
#       google_oauth_client_secret=... geocoder_user_agent=...

variable "registry" {
  type    = string
  default = "ghcr.io/octdanb/trade-management-systems"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "domain" {
  type        = string
  description = "Public hostname of the app (Traefik router)."
}

variable "media_domain" {
  type        = string
  description = "Public hostname browsers fetch photos from (routes to MinIO)."
}

variable "datacenters" {
  type    = list(string)
  default = ["dc1"]
}

variable "traefik_entrypoint" {
  type    = string
  default = "websecure"
}

variable "traefik_certresolver" {
  type    = string
  default = "letsencrypt"
}

job "mow" {
  datacenters = var.datacenters
  type        = "service"

  update {
    max_parallel     = 1
    min_healthy_time = "10s"
    healthy_deadline = "5m"
    auto_revert      = true
  }

  # --------------------------------------------------------------- database
  group "db" {
    network {
      mode = "bridge"
      port "db" {
        to = 5432
      }
    }

    volume "pgdata" {
      type      = "host"
      source    = "mow-pgdata"
      read_only = false
    }

    task "postgres" {
      driver = "docker"

      config {
        image = "postgres:17-alpine"
        ports = ["db"]
      }

      volume_mount {
        volume      = "pgdata"
        destination = "/var/lib/postgresql/data"
      }

      env {
        POSTGRES_DB   = "app"
        POSTGRES_USER = "app"
        PGDATA        = "/var/lib/postgresql/data/pgdata"
      }

      template {
        data        = <<-EOH
          {{- with nomadVar "nomad/jobs/mow" }}
          POSTGRES_PASSWORD={{ .db_password }}
          {{- end }}
        EOH
        destination = "secrets/db.env"
        env         = true
      }

      resources {
        cpu    = 300
        memory = 512
      }

      service {
        name     = "mow-db"
        port     = "db"
        provider = "nomad"

        check {
          type     = "tcp"
          interval = "10s"
          timeout  = "2s"
        }
      }
    }
  }

  # -------------------------------------------------------- object storage
  group "minio" {
    network {
      mode = "bridge"
      port "s3" {
        to = 9000
      }
    }

    volume "minio" {
      type      = "host"
      source    = "mow-minio"
      read_only = false
    }

    task "minio" {
      driver = "docker"

      config {
        image = "minio/minio:latest"
        args  = ["server", "/data"]
        ports = ["s3"]
      }

      volume_mount {
        volume      = "minio"
        destination = "/data"
      }

      template {
        data        = <<-EOH
          {{- with nomadVar "nomad/jobs/mow" }}
          MINIO_ROOT_USER={{ .minio_root_user }}
          MINIO_ROOT_PASSWORD={{ .minio_root_password }}
          {{- end }}
        EOH
        destination = "secrets/minio.env"
        env         = true
      }

      resources {
        cpu    = 200
        memory = 512
      }

      service {
        name     = "mow-minio"
        port     = "s3"
        provider = "nomad"

        # Photos are fetched by browsers from https://<media_domain>/media/<key>
        tags = [
          "traefik.enable=true",
          "traefik.http.routers.mow-media.rule=Host(`${var.media_domain}`)",
          "traefik.http.routers.mow-media.entrypoints=${var.traefik_entrypoint}",
          "traefik.http.routers.mow-media.tls.certresolver=${var.traefik_certresolver}",
        ]

        check {
          type     = "http"
          path     = "/minio/health/live"
          interval = "10s"
          timeout  = "2s"
        }
      }
    }

    # One-shot: create the public-download media bucket after MinIO is up.
    task "create-bucket" {
      driver = "docker"

      lifecycle {
        hook    = "poststart"
        sidecar = false
      }

      config {
        image      = "minio/mc"
        entrypoint = ["/bin/sh", "-c"]
        args = [
          "until mc alias set local http://127.0.0.1:9000 \"$MINIO_ROOT_USER\" \"$MINIO_ROOT_PASSWORD\"; do sleep 2; done && mc mb --ignore-existing local/media && mc anonymous set download local/media",
        ]
      }

      template {
        data        = <<-EOH
          {{- with nomadVar "nomad/jobs/mow" }}
          MINIO_ROOT_USER={{ .minio_root_user }}
          MINIO_ROOT_PASSWORD={{ .minio_root_password }}
          {{- end }}
        EOH
        destination = "secrets/mc.env"
        env         = true
      }

      resources {
        cpu    = 100
        memory = 128
      }
    }
  }

  # ------------------------------------------------- application (web + api)
  # Backend and frontend share the group's network namespace, so nginx
  # reaches Django at 127.0.0.1:8000 — no service discovery needed between
  # them. Only nginx (port 80) is exposed, via Traefik.
  group "app" {
    network {
      mode = "bridge"
      port "http" {
        to = 80
      }
    }

    task "backend" {
      driver = "docker"

      config {
        image   = "${var.registry}/backend:${var.image_tag}"
        command = "sh"
        args = [
          "-c",
          "python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3",
        ]
      }

      env {
        DJANGO_DEBUG                = "false"
        DJANGO_ALLOWED_HOSTS        = var.domain
        DJANGO_CSRF_TRUSTED_ORIGINS = "https://${var.domain}"
        FRONTEND_URL                = "https://${var.domain}"
        USE_S3_MEDIA                = "true"
        AWS_STORAGE_BUCKET_NAME     = "media"
        AWS_S3_CUSTOM_DOMAIN        = "${var.media_domain}/media"
        AWS_S3_URL_PROTOCOL         = "https:"
      }

      template {
        data        = <<-EOH
          {{- $v := nomadVar "nomad/jobs/mow" }}
          DJANGO_SECRET_KEY={{ $v.django_secret_key }}
          GOOGLE_OAUTH_CLIENT_ID={{ $v.google_oauth_client_id }}
          GOOGLE_OAUTH_CLIENT_SECRET={{ $v.google_oauth_client_secret }}
          GEOCODER_USER_AGENT={{ $v.geocoder_user_agent }}
          APP_BUILD_UPLOAD_TOKEN={{ $v.app_build_upload_token }}
          AWS_ACCESS_KEY_ID={{ $v.minio_root_user }}
          AWS_SECRET_ACCESS_KEY={{ $v.minio_root_password }}
          {{- range nomadService "mow-db" }}
          DATABASE_URL=postgres://app:{{ $v.db_password }}@{{ .Address }}:{{ .Port }}/app
          {{- end }}
          {{- range nomadService "mow-minio" }}
          AWS_S3_ENDPOINT_URL=http://{{ .Address }}:{{ .Port }}
          {{- end }}
        EOH
        destination = "secrets/app.env"
        env         = true
        change_mode = "restart"
      }

      resources {
        cpu    = 400
        memory = 512
      }
    }

    task "frontend" {
      driver = "docker"

      config {
        image = "${var.registry}/frontend:${var.image_tag}"
        ports = ["http"]
      }

      env {
        BACKEND_ORIGIN = "http://127.0.0.1:8000"
      }

      resources {
        cpu    = 100
        memory = 128
      }

      service {
        name     = "mow"
        port     = "http"
        provider = "nomad"

        tags = [
          "traefik.enable=true",
          "traefik.http.routers.mow.rule=Host(`${var.domain}`)",
          "traefik.http.routers.mow.entrypoints=${var.traefik_entrypoint}",
          "traefik.http.routers.mow.tls.certresolver=${var.traefik_certresolver}",
        ]

        check {
          type     = "http"
          path     = "/"
          interval = "10s"
          timeout  = "3s"
        }
      }
    }
  }
}
