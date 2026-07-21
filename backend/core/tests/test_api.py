from datetime import date
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase

from core.models import AppointmentSeries, Client, Job
from core.services import routing


class ApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user("owner", password="pw")
        cls.other = User.objects.create_user("other", password="pw")
        cls.client_a = Client.objects.create(user=cls.owner, name="Alice", rate="55.00")
        cls.series = AppointmentSeries.objects.create(
            user=cls.owner,
            client=cls.client_a,
            frequency="weekly",
            start_date=date(2026, 7, 1),
        )
        cls.job = Job.objects.create(
            user=cls.owner,
            client=cls.client_a,
            series=cls.series,
            scheduled_date=date(2026, 7, 1),
            original_date=date(2026, 7, 1),
            price="55.00",
        )
        cls.one_off = Job.objects.create(
            user=cls.owner,
            client=cls.client_a,
            scheduled_date=date(2026, 7, 2),
            price="30.00",
        )

    def login(self, user):
        self.client.force_login(user)


class AuthRequiredTests(ApiTestCase):
    def test_endpoints_require_auth(self):
        for method, url in [
            ("get", "/api/me"),
            ("get", "/api/clients"),
            ("get", "/api/jobs?start=2026-07-01&end=2026-08-01"),
            ("get", "/api/series"),
            ("get", "/api/route?date=2026-07-01"),
            ("get", "/api/profile"),
        ]:
            response = getattr(self.client, method)(url)
            self.assertEqual(response.status_code, 401, url)

    def test_health_is_public(self):
        self.assertEqual(self.client.get("/api/health").status_code, 200)


class CrossUserIsolationTests(ApiTestCase):
    def test_other_user_sees_no_data(self):
        self.login(self.other)
        self.assertEqual(self.client.get("/api/clients").json(), [])
        self.assertEqual(self.client.get("/api/series").json(), [])
        self.assertEqual(self.client.get("/api/jobs?start=2026-06-01&end=2026-08-01").json(), [])

    def test_other_user_cannot_touch_foreign_objects(self):
        self.login(self.other)
        self.assertEqual(self.client.get(f"/api/clients/{self.client_a.id}").status_code, 404)
        response = self.client.patch(
            f"/api/jobs/{self.job.id}", {"paid": True}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)
        response = self.client.post(
            f"/api/series/{self.series.id}/end",
            {"end_date": "2026-08-01"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_route_plan_only_shows_own_jobs(self):
        self.login(self.other)
        plan = self.client.get("/api/route?date=2026-07-01").json()
        self.assertEqual(plan["stops"], [])
        self.assertEqual(plan["unrouted"], [])


class JobEndpointTests(ApiTestCase):
    def test_series_occurrence_cannot_be_deleted(self):
        self.login(self.owner)
        response = self.client.delete(f"/api/jobs/{self.job.id}")
        self.assertEqual(response.status_code, 400)

    def test_one_off_can_be_deleted(self):
        self.login(self.owner)
        response = self.client.delete(f"/api/jobs/{self.one_off.id}")
        self.assertEqual(response.status_code, 204)

    def test_patch_marks_job_modified(self):
        self.login(self.owner)
        response = self.client.patch(
            f"/api/jobs/{self.job.id}",
            {"price": "60.00", "paid": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.job.refresh_from_db()
        self.assertTrue(self.job.modified)
        self.assertTrue(self.job.paid)
        self.assertEqual(str(self.job.price), "60.00")

    def test_create_job_defaults_price_to_client_rate(self):
        self.login(self.owner)
        response = self.client.post(
            "/api/jobs",
            {"client_id": self.client_a.id, "scheduled_date": "2026-07-10"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["price"], "55.00")

    def test_list_jobs_materializes_series_in_range(self):
        self.login(self.owner)
        response = self.client.get("/api/jobs?start=2026-07-01&end=2026-07-31")
        dates = [j["scheduled_date"] for j in response.json()]
        # Weekly series anchored 2026-07-01 fills the whole window.
        for expected in ("2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29"):
            self.assertIn(expected, dates)


class RouteEndpointTests(ApiTestCase):
    def test_ungeocoded_jobs_are_unrouted(self):
        self.login(self.owner)
        plan = self.client.get("/api/route?date=2026-07-01").json()
        self.assertEqual(len(plan["stops"]), 0)
        self.assertEqual(len(plan["unrouted"]), 1)

    def test_optimize_orders_geocoded_jobs(self):
        self.login(self.owner)
        Client.objects.filter(id=self.client_a.id).update(lat=-41.3, lng=174.78)
        b = Client.objects.create(user=self.owner, name="Bob", rate="40.00", lat=-41.29, lng=174.78)
        Job.objects.create(
            user=self.owner, client=b, scheduled_date=date(2026, 7, 1), price="40.00"
        )
        # Force OSRM to be unreachable; the haversine fallback must kick in.
        with mock.patch.object(routing.httpx, "get", side_effect=OSError("no network")):
            plan = self.client.post(
                "/api/route/optimize", {"date": "2026-07-01"}, content_type="application/json"
            ).json()
        self.assertEqual(len(plan["stops"]), 2)
        self.assertTrue(plan["used_fallback_matrix"])
        self.assertEqual([s["route_order"] for s in plan["stops"]], [0, 1])

    def test_reorder_persists_given_order(self):
        self.login(self.owner)
        Client.objects.filter(id=self.client_a.id).update(lat=-41.3, lng=174.78)
        b = Client.objects.create(user=self.owner, name="Bob", rate="40.00", lat=-41.29, lng=174.78)
        job_b = Job.objects.create(
            user=self.owner, client=b, scheduled_date=date(2026, 7, 1), price="40.00"
        )
        plan = self.client.post(
            "/api/route/reorder",
            {"date": "2026-07-01", "job_ids": [job_b.id, self.job.id]},
            content_type="application/json",
        ).json()
        self.assertEqual([s["id"] for s in plan["stops"]], [job_b.id, self.job.id])


class ClientEndpointTests(ApiTestCase):
    def test_create_without_address_skips_geocoding(self):
        self.login(self.owner)
        response = self.client.post(
            "/api/clients",
            {"name": "NoAddress", "rate": "20.00"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["geocode_status"], "pending")

    def test_search_filters(self):
        self.login(self.owner)
        response = self.client.get("/api/clients?search=ali")
        self.assertEqual([c["name"] for c in response.json()], ["Alice"])
        response = self.client.get("/api/clients?search=zzz")
        self.assertEqual(response.json(), [])
