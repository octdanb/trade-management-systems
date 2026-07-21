from django.conf import settings
from django.db import models


class GeocodeStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    OK = "ok", "OK"
    FAILED = "failed", "Failed"


class BusinessProfile(models.Model):
    """One per user; holds the route start point (home base)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="business_profile"
    )
    business_name = models.CharField(max_length=120, blank=True)
    home_address = models.CharField(max_length=255, blank=True)
    home_lat = models.FloatField(null=True, blank=True)
    home_lng = models.FloatField(null=True, blank=True)
    geocode_status = models.CharField(
        max_length=10, choices=GeocodeStatus.choices, default=GeocodeStatus.PENDING
    )

    def __str__(self):
        return self.business_name or f"Profile for {self.user}"


class Client(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="clients"
    )
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    # What he charges per visit and what a visit costs him.
    rate = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    geocode_status = models.CharField(
        max_length=10, choices=GeocodeStatus.choices, default=GeocodeStatus.PENDING
    )
    geocoded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class AppointmentSeries(models.Model):
    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        FORTNIGHTLY = "fortnightly", "Fortnightly"
        EVERY_3_WEEKS = "every_3_weeks", "Every 3 weeks"
        EVERY_4_WEEKS = "every_4_weeks", "Every 4 weeks"

    INTERVAL_DAYS = {
        Frequency.WEEKLY: 7,
        Frequency.FORTNIGHTLY: 14,
        Frequency.EVERY_3_WEEKS: 21,
        Frequency.EVERY_4_WEEKS: 28,
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="series"
    )
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="series")
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    start_date = models.DateField()
    default_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=60)
    end_date = models.DateField(null=True, blank=True)
    # High-water mark for lazy occurrence materialization.
    generated_until = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "appointment series"

    @property
    def interval_days(self) -> int:
        return self.INTERVAL_DAYS[self.Frequency(self.frequency)]

    def __str__(self):
        return f"{self.client} {self.get_frequency_display()} from {self.start_date}"


class Job(models.Model):
    """A single visit — either a one-off or a materialized series occurrence."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jobs"
    )
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="jobs")
    series = models.ForeignKey(
        AppointmentSeries, null=True, blank=True, on_delete=models.CASCADE, related_name="jobs"
    )
    scheduled_date = models.DateField(db_index=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=60)
    # The series slot this occurrence was generated for; survives rescheduling
    # so regeneration can never duplicate a moved/cancelled occurrence.
    original_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    paid = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    # Set on any manual per-occurrence edit; protects the row from series regeneration.
    modified = models.BooleanField(default=False)
    # Position within the day's route (per scheduled_date).
    route_order = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_date", "route_order", "scheduled_time", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["series", "original_date"],
                condition=models.Q(series__isnull=False),
                name="uniq_series_slot",
            )
        ]

    def __str__(self):
        return f"{self.client} on {self.scheduled_date} ({self.status})"
