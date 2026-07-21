"""
Access-token auth for API clients (the mobile app).

- Web (browser client) keeps using session cookies + CSRF — nothing changes.
- The mobile app talks to allauth's app client (/_allauth/app/v1/...). On
  authentication, allauth calls our token strategy, and the response's
  `meta` carries BOTH:
    * `session_token` — allauth's handle for further auth/account calls
      (sent as X-Session-Token), and
    * `access_token`  — OURS, sent to /api/* as `Authorization: Bearer ...`.

Access tokens are stateless signed payloads (Django's signing machinery,
scoped by salt), valid for ACCESS_TOKEN_TTL_DAYS. Stateless means no DB
lookup per request but also no server-side revocation — acceptable for the
prototype; swap in a DB/JWT-with-jti strategy later if revocation matters.
"""

from allauth.headless.tokens.strategies.sessions import SessionTokenStrategy
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from ninja.security import HttpBearer

SALT = "core.auth.access-token"


def make_access_token(user) -> str:
    return signing.dumps({"uid": user.pk}, salt=SALT)


def resolve_access_token(token: str):
    """Return the user for a valid, unexpired token, else None."""
    max_age = settings.ACCESS_TOKEN_TTL_DAYS * 24 * 3600
    try:
        payload = signing.loads(token, salt=SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    return get_user_model().objects.filter(pk=payload.get("uid"), is_active=True).first()


class AccessTokenStrategy(SessionTokenStrategy):
    """allauth headless strategy: session tokens + our access tokens."""

    def create_access_token(self, request) -> str | None:
        if not request.user.is_authenticated:
            return None
        return make_access_token(request.user)


class AccessTokenAuth(HttpBearer):
    """`Authorization: Bearer <access token>` auth for the ninja API."""

    def authenticate(self, request, token: str):
        user = resolve_access_token(token)
        if user is None:
            return None
        # Keep request.user consistent for anything downstream.
        request.user = user
        return user
