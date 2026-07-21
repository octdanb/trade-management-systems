from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from core.models import Equipment, Notification
from core.services import reminders

# 1x1 transparent PNG.
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415478da63fcffff3f030005fe02fea7566d310000000049454e44ae426082"
)


class EquipmentApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user("owner", password="pw")
        cls.other = User.objects.create_user("other", password="pw")
        cls.mower = Equipment.objects.create(
            user=cls.owner,
            name="Mower",
            service_interval_days=90,
            last_serviced_on=timezone.localdate() - timedelta(days=30),
            service_contact_name="Small Engines Ltd",
            service_contact_phone="04 123 4567",
        )

    def test_crud_and_isolation(self):
        self.client.force_login(self.owner)
        response = self.client.post(
            "/api/equipment",
            {"name": "Trimmer", "service_interval_days": 180},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["next_service_due"], None)  # no anchor date yet

        self.client.force_login(self.other)
        self.assertEqual(self.client.get("/api/equipment").json(), [])
        self.assertEqual(self.client.get(f"/api/equipment/{self.mower.id}").status_code, 404)

    def test_next_service_due_from_last_service(self):
        due = self.mower.next_service_due
        self.assertEqual(due, self.mower.last_serviced_on + timedelta(days=90))

    def test_log_service_advances_clock(self):
        self.client.force_login(self.owner)
        today = timezone.localdate()
        response = self.client.post(
            f"/api/equipment/{self.mower.id}/service",
            {"serviced_on": str(today), "notes": "Blades sharpened", "cost": "85.00"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.mower.refresh_from_db()
        self.assertEqual(self.mower.last_serviced_on, today)

    def test_delete_service_record_rolls_clock_back(self):
        self.client.force_login(self.owner)
        today = timezone.localdate()
        first = self.client.post(
            f"/api/equipment/{self.mower.id}/service",
            {"serviced_on": str(today - timedelta(days=10))},
            content_type="application/json",
        ).json()
        self.client.post(
            f"/api/equipment/{self.mower.id}/service",
            {"serviced_on": str(today)},
            content_type="application/json",
        )
        self.mower.refresh_from_db()
        self.assertEqual(self.mower.last_serviced_on, today)

        # Delete the newer record via the API — the older one becomes latest.
        latest_id = self.mower.service_records.first().id
        response = self.client.delete(f"/api/equipment/{self.mower.id}/service/{latest_id}")
        self.assertEqual(response.status_code, 204)
        self.mower.refresh_from_db()
        self.assertEqual(str(self.mower.last_serviced_on), first["serviced_on"])

    def test_photo_upload_and_delete(self):
        self.client.force_login(self.owner)
        with override_settings(MEDIA_ROOT="/tmp/test-media"):
            upload = SimpleUploadedFile("mower.png", TINY_PNG, content_type="image/png")
            response = self.client.post(
                f"/api/equipment/{self.mower.id}/photos",
                {"file": upload, "caption": "After service"},
            )
            self.assertEqual(response.status_code, 201)
            photo = response.json()
            self.assertTrue(photo["url"].startswith("/media/equipment/"))
            self.assertEqual(photo["caption"], "After service")

            detail = self.client.get(f"/api/equipment/{self.mower.id}").json()
            self.assertEqual(len(detail["photos"]), 1)

            response = self.client.delete(f"/api/equipment/{self.mower.id}/photos/{photo['id']}")
            self.assertEqual(response.status_code, 204)


class ReminderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("owner", password="pw")
        today = timezone.localdate()
        cls.overdue = Equipment.objects.create(
            user=cls.user,
            name="Old mower",
            service_interval_days=30,
            last_serviced_on=today - timedelta(days=45),
        )
        cls.due_soon = Equipment.objects.create(
            user=cls.user,
            name="Trimmer",
            service_interval_days=30,
            last_serviced_on=today - timedelta(days=27),  # due in 3 days
        )
        cls.not_due = Equipment.objects.create(
            user=cls.user,
            name="New blower",
            service_interval_days=90,
            last_serviced_on=today,
        )
        cls.no_interval = Equipment.objects.create(user=cls.user, name="Rake")
        cls.retired = Equipment.objects.create(
            user=cls.user,
            name="Dead mower",
            status=Equipment.Status.RETIRED,
            service_interval_days=30,
            last_serviced_on=today - timedelta(days=100),
        )

    def test_due_equipment_window(self):
        names = [e.name for e in reminders.due_equipment(self.user)]
        self.assertEqual(names, ["Old mower", "Trimmer"])  # overdue first

    def test_generate_is_deduped_per_day(self):
        created = reminders.generate_service_reminders(self.user)
        self.assertEqual(len(created), 2)
        self.assertIn("overdue", created[0].title)
        # Second run the same day creates nothing new.
        self.assertEqual(reminders.generate_service_reminders(self.user), [])
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 2)

    def test_reminders_endpoint(self):
        self.client.force_login(self.user)
        data = self.client.get("/api/reminders").json()
        self.assertEqual(len(data), 2)
        self.assertTrue(data[0]["overdue"])
        self.assertEqual(data[1]["days_until"], 3)

    def test_run_reminders_endpoint_and_read_flow(self):
        self.client.force_login(self.user)
        created = self.client.post("/api/reminders/run").json()
        self.assertEqual(len(created), 2)

        unread = self.client.get("/api/notifications?unread=true").json()
        self.assertEqual(len(unread), 2)

        response = self.client.post(f"/api/notifications/{unread[0]['id']}/read")
        self.assertIsNotNone(response.json()["read_at"])

        self.client.post("/api/notifications/read-all")
        self.assertEqual(self.client.get("/api/notifications?unread=true").json(), [])


class PushDeviceTests(TestCase):
    def test_register_is_idempotent(self):
        user = User.objects.create_user("owner", password="pw")
        self.client.force_login(user)
        for _ in range(2):
            response = self.client.post(
                "/api/devices",
                {"token": "expo-token-123", "platform": "android"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 201)
        self.assertEqual(user.push_devices.count(), 1)
