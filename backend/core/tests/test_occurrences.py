from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase

from core.models import AppointmentSeries, Client, Job
from core.services import occurrences


def make_series(user, client, frequency="fortnightly", start=date(2026, 7, 22), **kwargs):
    return AppointmentSeries.objects.create(
        user=user, client=client, frequency=frequency, start_date=start, **kwargs
    )


class OccurrenceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("owner")
        cls.client_ = Client.objects.create(user=cls.user, name="Alice", rate="55.00")

    def dates(self, series):
        return sorted(series.jobs.values_list("scheduled_date", flat=True))

    def test_materialize_aligns_slots_to_start_date(self):
        series = make_series(self.user, self.client_)
        occurrences.materialize(series, date(2026, 9, 1))
        self.assertEqual(
            self.dates(series),
            [date(2026, 7, 22), date(2026, 8, 5), date(2026, 8, 19)],
        )
        # Snapshot of the client's rate at generation time.
        self.assertTrue(all(str(j.price) == "55.00" for j in series.jobs.all()))

    def test_materialize_is_idempotent_and_extends(self):
        series = make_series(self.user, self.client_)
        occurrences.materialize(series, date(2026, 9, 1))
        occurrences.materialize(series, date(2026, 9, 1))
        self.assertEqual(series.jobs.count(), 3)
        occurrences.materialize(series, date(2026, 10, 1))
        self.assertEqual(series.jobs.count(), 6)  # Sep 2, 16, 30 added

    def test_materialize_respects_end_date(self):
        series = make_series(self.user, self.client_, end_date=date(2026, 8, 10))
        occurrences.materialize(series, date(2026, 12, 1))
        self.assertEqual(self.dates(series), [date(2026, 7, 22), date(2026, 8, 5)])

    def test_moved_occurrence_is_not_duplicated_on_regeneration(self):
        series = make_series(self.user, self.client_)
        occurrences.materialize(series, date(2026, 9, 1))
        job = series.jobs.get(original_date=date(2026, 8, 5))
        job.scheduled_date = date(2026, 8, 6)
        job.modified = True
        job.save()

        series.generated_until = None
        series.save()
        occurrences.materialize(series, date(2026, 9, 1))
        self.assertEqual(series.jobs.count(), 3)
        self.assertEqual(series.jobs.filter(original_date=date(2026, 8, 5)).count(), 1)

    def test_series_edit_regenerates_future_but_keeps_touched_jobs(self):
        series = make_series(self.user, self.client_)
        occurrences.materialize(series, date(2026, 10, 1))

        moved = series.jobs.get(original_date=date(2026, 8, 5))
        moved.scheduled_date = date(2026, 8, 6)
        moved.modified = True
        moved.save()
        done = series.jobs.get(original_date=date(2026, 8, 19))
        done.status = Job.Status.COMPLETED
        done.save()

        occurrences.apply_series_edit(series, {"frequency": "weekly"}, date(2026, 8, 1))

        self.assertTrue(series.jobs.filter(id=moved.id).exists())
        self.assertTrue(series.jobs.filter(id=done.id).exists())
        # Weekly slots regenerated from apply_from, still anchored to start_date.
        self.assertIn(date(2026, 8, 12), self.dates(series))
        self.assertIn(date(2026, 8, 26), self.dates(series))
        # The untouched pre-edit fortnightly future slots were replaced, not kept:
        # every scheduled unmodified job now follows the weekly cadence.
        future_unmodified = series.jobs.filter(
            modified=False, status=Job.Status.SCHEDULED, scheduled_date__gte=date(2026, 8, 1)
        )
        for job in future_unmodified:
            self.assertEqual((job.original_date - series.start_date).days % 7, 0)

    def test_end_series_clears_future_scheduled_keeps_history(self):
        series = make_series(self.user, self.client_)
        occurrences.materialize(series, date(2026, 10, 1))
        done = series.jobs.get(original_date=date(2026, 7, 22))
        done.status = Job.Status.COMPLETED
        done.save()

        occurrences.end_series(series, date(2026, 8, 10))
        self.assertEqual(self.dates(series), [date(2026, 7, 22), date(2026, 8, 5)])
        # Materializing again must not resurrect anything past the end date.
        occurrences.materialize(series, date(2026, 12, 1))
        self.assertEqual(series.jobs.count(), 2)

    def test_ensure_range_extends_all_stale_series(self):
        s1 = make_series(self.user, self.client_)
        s2 = make_series(self.user, self.client_, frequency="weekly", start=date(2026, 7, 1))
        occurrences.materialize(s1, date(2026, 8, 1))
        occurrences.ensure_range(self.user, date(2026, 9, 1))
        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertGreaterEqual(s1.generated_until, date(2026, 9, 1))
        self.assertGreaterEqual(s2.generated_until, date(2026, 9, 1))

    def test_cancelled_occurrence_blocks_resurrection(self):
        series = make_series(self.user, self.client_)
        occurrences.materialize(series, date(2026, 9, 1))
        job = series.jobs.get(original_date=date(2026, 8, 5))
        job.status = Job.Status.CANCELLED
        job.save()

        series.generated_until = None
        series.save()
        occurrences.materialize(series, date(2026, 9, 1))
        self.assertEqual(series.jobs.filter(original_date=date(2026, 8, 5)).count(), 1)
        self.assertEqual(
            series.jobs.get(original_date=date(2026, 8, 5)).status, Job.Status.CANCELLED
        )

    def test_start_in_future_generates_nothing_until_reached(self):
        series = make_series(self.user, self.client_, start=date(2026, 12, 1))
        occurrences.materialize(series, date(2026, 9, 1))
        self.assertEqual(series.jobs.count(), 0)
        occurrences.materialize(series, date(2026, 12, 31))
        self.assertEqual(
            self.dates(series), [date(2026, 12, 1), date(2026, 12, 15), date(2026, 12, 29)]
        )


class SeriesEditHorizonTests(TestCase):
    def test_horizon_constant_sane(self):
        self.assertGreaterEqual(occurrences.DEFAULT_HORIZON_DAYS, 60)

    def test_edit_moves_generated_until_back_only_when_needed(self):
        user = User.objects.create_user("owner2")
        client = Client.objects.create(user=user, name="Bob", rate="40.00")
        series = AppointmentSeries.objects.create(
            user=user, client=client, frequency="weekly", start_date=date(2026, 7, 1)
        )
        occurrences.materialize(series, date(2026, 8, 1))
        occurrences.apply_series_edit(
            series, {"frequency": "weekly"}, date.today() + timedelta(days=365)
        )
        series.refresh_from_db()
        # apply_from beyond the horizon: mark must not move backwards past it.
        self.assertGreaterEqual(series.generated_until, date(2026, 8, 1))
