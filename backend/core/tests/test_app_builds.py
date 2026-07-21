from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from core.models import AppBuild


@override_settings(MEDIA_ROOT="/tmp/test-media")
class AppBuildTests(TestCase):
    def make_build(self, version="1.0.0", code=1, platform="android"):
        return AppBuild.objects.create(
            platform=platform,
            version=version,
            version_code=code,
            file=SimpleUploadedFile(f"mow-{version}.apk", b"apk-bytes"),
        )

    def test_latest_is_public_and_returns_newest(self):
        self.make_build("1.0.0", 1)
        self.make_build("1.1.0", 2)
        response = self.client.get("/api/app/latest?platform=android")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["version"], "1.1.0")
        self.assertEqual(data["version_code"], 2)
        self.assertIn("/media/app-builds/", data["download_url"])

    def test_latest_404_when_no_builds(self):
        self.assertEqual(self.client.get("/api/app/latest").status_code, 404)

    def test_latest_filters_by_platform(self):
        self.make_build("1.0.0", 1, platform="android")
        self.assertEqual(self.client.get("/api/app/latest?platform=ios").status_code, 404)

    @override_settings(APP_BUILD_UPLOAD_TOKEN="s3cret", MEDIA_ROOT="/tmp/test-media")
    def test_upload_with_token(self):
        response = self.client.post(
            "/api/app/builds",
            {
                "file": SimpleUploadedFile("mow.apk", b"apk-bytes"),
                "version": "1.2.0",
                "version_code": 3,
                "platform": "android",
                "notes": "Beta",
            },
            headers={"X-Upload-Token": "s3cret"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["version"], "1.2.0")

    @override_settings(APP_BUILD_UPLOAD_TOKEN="s3cret", MEDIA_ROOT="/tmp/test-media")
    def test_upload_wrong_token_rejected(self):
        response = self.client.post(
            "/api/app/builds",
            {
                "file": SimpleUploadedFile("mow.apk", b"apk-bytes"),
                "version": "1.2.0",
                "version_code": 3,
            },
            headers={"X-Upload-Token": "nope"},
        )
        self.assertEqual(response.status_code, 403)

    def test_upload_disabled_when_token_unset(self):
        response = self.client.post(
            "/api/app/builds",
            {
                "file": SimpleUploadedFile("mow.apk", b"apk-bytes"),
                "version": "1.2.0",
                "version_code": 3,
            },
            headers={"X-Upload-Token": ""},
        )
        self.assertEqual(response.status_code, 403)

    @override_settings(APP_BUILD_UPLOAD_TOKEN="s3cret", MEDIA_ROOT="/tmp/test-media")
    def test_duplicate_version_code_conflicts(self):
        self.make_build("1.2.0", 3)
        response = self.client.post(
            "/api/app/builds",
            {
                "file": SimpleUploadedFile("mow.apk", b"apk-bytes"),
                "version": "1.2.1",
                "version_code": 3,
            },
            headers={"X-Upload-Token": "s3cret"},
        )
        self.assertEqual(response.status_code, 409)
