"""
Lazy materialization of appointment-series occurrences into Job rows.

Invariants:
- Slots are anchored to `series.start_date` and spaced `interval_days` apart.
- A slot is identified by `original_date`; the unique constraint
  (series, original_date) plus get_or_create makes generation idempotent, so
  moved (modified=True) or cancelled occurrences are never duplicated or
  resurrected.
- `generated_until` is a high-water mark: slots up to and including it exist
  (or existed and were deliberately removed by a series edit).
"""

from datetime import date, timedelta

from django.db import transaction

from core.models import AppointmentSeries, Job

# How far ahead to materialize when a series is created or edited.
DEFAULT_HORIZON_DAYS = 90


def materialize(series: AppointmentSeries, until: date) -> None:
    """Idempotently create Job rows for slots in (generated_until, until]."""
    interval = series.interval_days
    hard_end = min(until, series.end_date) if series.end_date else until

    floor = series.generated_until
    if floor is None or floor < series.start_date:
        slot = series.start_date
    else:
        # First slot strictly after the high-water mark.
        k = (floor - series.start_date).days // interval + 1
        slot = series.start_date + timedelta(days=k * interval)

    while slot <= hard_end:
        Job.objects.get_or_create(
            series=series,
            original_date=slot,
            defaults={
                "user": series.user,
                "client": series.client,
                "scheduled_date": slot,
                "scheduled_time": series.default_time,
                "duration_minutes": series.duration_minutes,
                "price": series.client.rate,
            },
        )
        slot += timedelta(days=interval)

    if series.generated_until is None or hard_end > series.generated_until:
        series.generated_until = hard_end
        series.save(update_fields=["generated_until"])


def ensure_range(user, end: date) -> None:
    """Extend all of the user's series so occurrences exist through `end`."""
    stale = AppointmentSeries.objects.filter(user=user).exclude(generated_until__gte=end)
    for series in stale.select_related("client"):
        materialize(series, end)


@transaction.atomic
def apply_series_edit(series: AppointmentSeries, data: dict, apply_from: date) -> None:
    """
    "This and following" edit: future scheduled, untouched occurrences from
    `apply_from` are regenerated under the new settings; completed/skipped/
    cancelled/manually-modified occurrences survive.
    """
    series.jobs.filter(
        scheduled_date__gte=apply_from,
        status=Job.Status.SCHEDULED,
        modified=False,
    ).delete()

    for field in ("frequency", "default_time", "duration_minutes", "end_date"):
        if field in data:
            setattr(series, field, data[field])

    if series.generated_until is not None and series.generated_until >= apply_from:
        series.generated_until = apply_from - timedelta(days=1)
    series.save()

    materialize(series, date.today() + timedelta(days=DEFAULT_HORIZON_DAYS))


@transaction.atomic
def end_series(series: AppointmentSeries, end_date: date) -> None:
    """Stop the series after `end_date`; visits on/before it are kept."""
    series.end_date = end_date
    if series.generated_until is None or series.generated_until > end_date:
        series.generated_until = end_date
    series.save(update_fields=["end_date", "generated_until"])
    series.jobs.filter(
        scheduled_date__gt=end_date,
        status=Job.Status.SCHEDULED,
        modified=False,
    ).delete()
