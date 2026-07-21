"""
Exercises the S3 media storage path with moto (in-process AWS mock): the same
django-storages backend and options shape that config.settings builds when
USE_S3_MEDIA=true, driven through the real photo-upload API.
"""

import boto3
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from moto import mock_aws

from core.models import Equipment

from .test_equipment import TINY_PNG

S3_STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": "media",
            "region_name": "us-east-1",
            "custom_domain": "localhost:9000/media",
            "url_protocol": "http:",
            "querystring_auth": False,
            "file_overwrite": False,
        },
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


@mock_aws
@override_settings(STORAGES=S3_STORAGES)
class S3MediaStorageTests(TestCase):
    def setUp(self):
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket="media")
        self.user = User.objects.create_user("owner", password="pw")
        self.mower = Equipment.objects.create(user=self.user, name="Mower")
        self.client.force_login(self.user)

    def upload(self, filename="mower.png"):
        return self.client.post(
            f"/api/equipment/{self.mower.id}/photos",
            {"file": SimpleUploadedFile(filename, TINY_PNG, content_type="image/png")},
        )

    def test_upload_stores_object_in_bucket_and_builds_public_url(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201)
        url = response.json()["url"]
        self.assertTrue(url.startswith("http://localhost:9000/media/equipment/"), url)
        self.assertNotIn("AWSAccessKeyId", url)  # unsigned (public bucket)

        keys = [
            o["Key"]
            for o in boto3.client("s3", region_name="us-east-1")
            .list_objects_v2(Bucket="media")
            .get("Contents", [])
        ]
        self.assertEqual(len(keys), 1)
        self.assertTrue(keys[0].startswith("equipment/"))

    def test_same_filename_does_not_overwrite(self):
        self.upload("same.png")
        self.upload("same.png")
        keys = (
            boto3.client("s3", region_name="us-east-1")
            .list_objects_v2(Bucket="media")
            .get("Contents", [])
        )
        self.assertEqual(len(keys), 2)

    def test_photo_delete_removes_object(self):
        photo = self.upload().json()
        response = self.client.delete(f"/api/equipment/{self.mower.id}/photos/{photo['id']}")
        self.assertEqual(response.status_code, 204)
        contents = (
            boto3.client("s3", region_name="us-east-1")
            .list_objects_v2(Bucket="media")
            .get("Contents", [])
        )
        self.assertEqual(contents, [])

    def test_equipment_delete_removes_objects(self):
        self.upload()
        self.upload()
        response = self.client.delete(f"/api/equipment/{self.mower.id}")
        self.assertEqual(response.status_code, 204)
        contents = (
            boto3.client("s3", region_name="us-east-1")
            .list_objects_v2(Bucket="media")
            .get("Contents", [])
        )
        self.assertEqual(contents, [])
