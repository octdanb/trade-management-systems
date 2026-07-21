from django.contrib.auth.models import User
from django.core import signing
from django.test import TestCase, override_settings

from core.auth import make_access_token, resolve_access_token


class AccessTokenTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("owner", password="pw", email="o@example.com")

    def test_roundtrip(self):
        token = make_access_token(self.user)
        self.assertEqual(resolve_access_token(token), self.user)

    def test_tampered_token_rejected(self):
        token = make_access_token(self.user)
        self.assertIsNone(resolve_access_token(token[:-2] + "xx"))

    def test_wrong_salt_rejected(self):
        token = signing.dumps({"uid": self.user.pk}, salt="something-else")
        self.assertIsNone(resolve_access_token(token))

    def test_inactive_user_rejected(self):
        token = make_access_token(self.user)
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertIsNone(resolve_access_token(token))

    @override_settings(ACCESS_TOKEN_TTL_DAYS=0)
    def test_expired_token_rejected(self):
        token = make_access_token(self.user)
        self.assertIsNone(resolve_access_token(token))

    def test_bearer_auth_on_api(self):
        token = make_access_token(self.user)
        response = self.client.get("/api/me", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "owner")

    def test_bad_bearer_is_401(self):
        response = self.client.get("/api/me", HTTP_AUTHORIZATION="Bearer nonsense")
        self.assertEqual(response.status_code, 401)

    def test_session_auth_still_works(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get("/api/me").status_code, 200)


class AppClientFlowTests(TestCase):
    """The mobile flow: app-client signup/login returns both tokens."""

    def test_signup_returns_access_and_session_tokens(self):
        response = self.client.post(
            "/_allauth/app/v1/auth/signup",
            {"email": "mobile@example.com", "password": "grass-cutter-77"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        meta = response.json()["meta"]
        self.assertIn("session_token", meta)
        self.assertIn("access_token", meta)

        # The access token authenticates against our ninja API.
        api = self.client.get("/api/me", HTTP_AUTHORIZATION=f"Bearer {meta['access_token']}")
        self.assertEqual(api.status_code, 200)
        self.assertEqual(api.json()["email"], "mobile@example.com")

        # The session token drives further allauth calls (e.g. session GET).
        session = self.client.get(
            "/_allauth/app/v1/auth/session",
            HTTP_X_SESSION_TOKEN=meta["session_token"],
        )
        self.assertEqual(session.status_code, 200)

    def test_login_returns_tokens(self):
        User.objects.create_user("m2", password="grass-cutter-88", email="m2@example.com")
        response = self.client.post(
            "/_allauth/app/v1/auth/login",
            {"email": "m2@example.com", "password": "grass-cutter-88"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json()["meta"])
