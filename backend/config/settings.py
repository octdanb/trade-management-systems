"""
Django settings for the trade-management backend.

Configuration is environment-driven so the same settings module works for
local dev (docker compose / bare metal) and production images.
"""

import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes", "on")


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key")

DEBUG = env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")

CSRF_TRUSTED_ORIGINS = os.environ.get(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://localhost:8000"
).split(",")

# The public origin the browser uses to reach the app (the Vite dev server in
# local dev). Used for allauth headless redirects (email confirm links, social
# login error pages, ...).
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # third party
    "ninja",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.headless",
    # local
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=60,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Pacific/Auckland"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SITE_ID = 1

# ---------------------------------------------------------------------------
# Authentication (django-allauth, headless mode)
#
# The React SPA talks to allauth's headless JSON API under /_allauth/browser/v1
# for registration, login, logout and session state. Google login uses the
# "provider redirect" flow. Sessions are plain Django session cookies, which
# works because the Vite dev server proxies API requests to Django
# (same-origin from the browser's point of view).
# ---------------------------------------------------------------------------

ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*"]
ACCOUNT_EMAIL_VERIFICATION = "none"  # prototyping: no verification emails to click
ACCOUNT_UNIQUE_EMAIL = True

HEADLESS_ONLY = True
HEADLESS_FRONTEND_URLS = {
    "account_confirm_email": FRONTEND_URL + "/verify-email/{key}",
    "account_reset_password": FRONTEND_URL + "/reset-password",
    "account_reset_password_from_key": FRONTEND_URL + "/reset-password/{key}",
    "account_signup": FRONTEND_URL + "/signup",
    "socialaccount_login_error": FRONTEND_URL + "/login?error=social",
}

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""),
            "secret": os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", ""),
        },
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        # Auto-signup: a Google login with an unseen email creates the account.
        "EMAIL_AUTHENTICATION": True,
    }
}
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True

# ---------------------------------------------------------------------------
# Geocoding & routing (OpenStreetMap public services; swap URLs to self-hosted
# instances if usage grows — both have strict fair-use policies).
# ---------------------------------------------------------------------------

# `or` fallbacks so empty env vars (e.g. from docker compose) keep the default.
NOMINATIM_URL = os.environ.get("NOMINATIM_URL") or "https://nominatim.openstreetmap.org"
OSRM_URL = os.environ.get("OSRM_URL") or "https://router.project-osrm.org"
# Nominatim policy requires an identifying User-Agent with contact details.
GEOCODER_USER_AGENT = (
    os.environ.get("GEOCODER_USER_AGENT")
    or "trade-management-systems/0.1 (set GEOCODER_USER_AGENT)"
)
# Bias geocoding results to a country (ISO 3166-1 alpha-2), empty to disable.
GEOCODER_COUNTRY_CODES = os.environ.get("GEOCODER_COUNTRY_CODES", "nz")

EMAIL_BACKEND = os.environ.get(
    "DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.environ.get("DJANGO_DEFAULT_FROM_EMAIL", "noreply@localhost")

# Security hardening for non-debug deployments.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
