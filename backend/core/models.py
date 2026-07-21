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


class JobStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    COMPLETED = "completed", "Completed"
    SKIPPED = "skipped", "Skipped"
    CANCELLED = "cancelled", "Cancelled"


class Job(models.Model):
    """A single visit — either a one-off or a materialized series occurrence."""

    Status = JobStatus

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


class EquipmentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    RETIRED = "retired", "Retired"


class Equipment(models.Model):
    """A tool or machine (mower, trimmer, trailer, ...) with service tracking."""

    Status = EquipmentStatus

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="equipment"
    )
    name = models.CharField(max_length=120)
    make_model = models.CharField(max_length=120, blank=True)
    serial_number = models.CharField(max_length=120, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    # Service cadence: due every N days after the last service (or purchase).
    service_interval_days = models.PositiveIntegerField(null=True, blank=True)
    last_serviced_on = models.DateField(null=True, blank=True)
    # Who to call when it needs servicing.
    service_contact_name = models.CharField(max_length=120, blank=True)
    service_contact_phone = models.CharField(max_length=40, blank=True)
    service_contact_email = models.EmailField(blank=True)
    service_contact_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "equipment"

    @property
    def next_service_due(self):
        """Date the next service is due, or None when no cadence is set."""
        from datetime import timedelta

        if not self.service_interval_days:
            return None
        anchor = self.last_serviced_on or self.purchase_date
        if anchor is None:
            return None
        return anchor + timedelta(days=self.service_interval_days)

    def __str__(self):
        return self.name


class EquipmentPhoto(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="equipment/%Y/%m/")
    caption = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]


class ServiceRecord(models.Model):
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name="service_records"
    )
    serviced_on = models.DateField()
    notes = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-serviced_on", "-id"]


class PushDevice(models.Model):
    """A registered device for push notifications (future React Native app)."""

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"
        WEB = "web", "Web"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_devices"
    )
    token = models.CharField(max_length=255)
    platform = models.CharField(max_length=10, choices=Platform.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "token"], name="uniq_user_device_token")
        ]


class Notification(models.Model):
    """
    Notification outbox. Today this doubles as the in-app notification feed
    and a MOCK of the push pipeline: `services.notifications.send_push` writes
    rows here instead of calling FCM/APNs. The React Native app later swaps
    the transport without touching callers.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class AppBuild(models.Model):
    """A distributable mobile app build (beta APKs, later store builds)."""

    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"

    platform = models.CharField(max_length=10, choices=Platform.choices)
    version = models.CharField(max_length=32)  # human version, e.g. "1.2.0"
    version_code = models.PositiveIntegerField()  # monotonically increasing
    file = models.FileField(upload_to="app-builds/")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version_code", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["platform", "version_code"], name="uniq_platform_version_code"
            )
        ]

    def __str__(self):
        return f"{self.platform} {self.version} ({self.version_code})"
