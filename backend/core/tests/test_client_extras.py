"""Client notes/photos and quote appointments (job kind + job photos)."""

from datetime import date

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import Client, ClientNote, ClientPhoto, Job, JobPhoto

# 1x1 transparent PNG.
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415478da63fcffff3f030005fe02fea7566d310000000049454e44ae426082"
)


def png(name="photo.png"):
    return SimpleUploadedFile(name, TINY_PNG, content_type="image/png")


class ClientNotesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user("owner", password="pw")
        cls.other = User.objects.create_user("other", password="pw")
        cls.client_row = Client.objects.create(user=cls.owner, name="Alice", rate="60.00")

    def test_create_list_delete_note(self):
        self.client.force_login(self.owner)
        response = self.client.post(
            f"/api/clients/{self.client_row.id}/notes",
            {"body": "Gate code is 4321"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        note_id = response.json()["id"]

        detail = self.client.get(f"/api/clients/{self.client_row.id}").json()
        self.assertEqual([n["body"] for n in detail["note_entries"]], ["Gate code is 4321"])

        response = self.client.delete(f"/api/clients/{self.client_row.id}/notes/{note_id}")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ClientNote.objects.exists())

    def test_notes_isolated_between_users(self):
        note = ClientNote.objects.create(client=self.client_row, body="secret")
        self.client.force_login(self.other)
        response = self.client.post(
            f"/api/clients/{self.client_row.id}/notes",
            {"body": "intruder"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        response = self.client.delete(f"/api/clients/{self.client_row.id}/notes/{note.id}")
        self.assertEqual(response.status_code, 404)
        self.assertTrue(ClientNote.objects.filter(id=note.id).exists())


class ClientPhotosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user("owner", password="pw")
        cls.other = User.objects.create_user("other", password="pw")
        cls.client_row = Client.objects.create(user=cls.owner, name="Alice", rate="60.00")

    def test_upload_and_delete_photo(self):
        self.client.force_login(self.owner)
        response = self.client.post(
            f"/api/clients/{self.client_row.id}/photos",
            {"file": png(), "caption": "Front lawn"},
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["caption"], "Front lawn")
        self.assertTrue(body["url"])

        detail = self.client.get(f"/api/clients/{self.client_row.id}").json()
        self.assertEqual(len(detail["photos"]), 1)

        response = self.client.delete(f"/api/clients/{self.client_row.id}/photos/{body['id']}")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ClientPhoto.objects.exists())

    def test_photos_isolated_between_users(self):
        photo = ClientPhoto.objects.create(client=self.client_row, image=png())
        self.client.force_login(self.other)
        response = self.client.post(f"/api/clients/{self.client_row.id}/photos", {"file": png()})
        self.assertEqual(response.status_code, 404)
        response = self.client.delete(f"/api/clients/{self.client_row.id}/photos/{photo.id}")
        self.assertEqual(response.status_code, 404)


class QuoteJobsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user("owner", password="pw")
        cls.other = User.objects.create_user("other", password="pw")
        cls.client_row = Client.objects.create(user=cls.owner, name="Alice", rate="60.00")

    def test_create_quote_and_convert_to_job(self):
        self.client.force_login(self.owner)
        response = self.client.post(
            "/api/jobs",
            {
                "client_id": self.client_row.id,
                "scheduled_date": str(date.today()),
                "kind": "quote",
                "price": "0",
                "notes": "Measure the back section",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["kind"], "quote")
        job_id = body["id"]

        # Accepted: flip the quote into a job with the agreed price.
        response = self.client.patch(
            f"/api/jobs/{job_id}",
            {"kind": "job", "price": "80.00"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["kind"], "job")

    def test_list_jobs_filters_by_kind(self):
        Job.objects.create(
            user=self.owner, client=self.client_row, scheduled_date=date.today(), price="60"
        )
        Job.objects.create(
            user=self.owner,
            client=self.client_row,
            scheduled_date=date.today(),
            price="0",
            kind=Job.Kind.QUOTE,
        )
        self.client.force_login(self.owner)
        window = {"start": str(date.today()), "end": str(date.today())}
        both = self.client.get("/api/jobs", window).json()
        self.assertEqual(len(both), 2)
        quotes = self.client.get("/api/jobs", {**window, "kind": "quote"}).json()
        self.assertEqual([j["kind"] for j in quotes], ["quote"])


class JobPhotosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user("owner", password="pw")
        cls.other = User.objects.create_user("other", password="pw")
        cls.client_row = Client.objects.create(user=cls.owner, name="Alice", rate="60.00")
        cls.job = Job.objects.create(
            user=cls.owner,
            client=cls.client_row,
            scheduled_date=date.today(),
            price="0",
            kind=Job.Kind.QUOTE,
        )

    def test_upload_and_delete_job_photo(self):
        self.client.force_login(self.owner)
        response = self.client.post(
            f"/api/jobs/{self.job.id}/photos",
            {"file": png(), "caption": "Overgrown hedge"},
        )
        self.assertEqual(response.status_code, 201)
        photo_id = response.json()["id"]

        window = {"start": str(date.today()), "end": str(date.today())}
        jobs = self.client.get("/api/jobs", window).json()
        self.assertEqual(len(jobs[0]["photos"]), 1)

        response = self.client.delete(f"/api/jobs/{self.job.id}/photos/{photo_id}")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(JobPhoto.objects.exists())

    def test_job_photos_isolated_between_users(self):
        photo = JobPhoto.objects.create(job=self.job, image=png())
        self.client.force_login(self.other)
        response = self.client.post(f"/api/jobs/{self.job.id}/photos", {"file": png()})
        self.assertEqual(response.status_code, 404)
        response = self.client.delete(f"/api/jobs/{self.job.id}/photos/{photo.id}")
        self.assertEqual(response.status_code, 404)
