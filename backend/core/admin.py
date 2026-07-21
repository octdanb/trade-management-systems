from django.contrib import admin

from core.models import (
    AppBuild,
    AppointmentSeries,
    BusinessProfile,
    Client,
    ClientNote,
    ClientPhoto,
    Job,
    JobPhoto,
)


class ClientNoteInline(admin.TabularInline):
    model = ClientNote
    extra = 0


class ClientPhotoInline(admin.TabularInline):
    model = ClientPhoto
    extra = 0


class JobPhotoInline(admin.TabularInline):
    model = JobPhoto
    extra = 0


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "business_name", "home_address", "geocode_status")


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "phone",
        "address",
        "rate",
        "cost",
        "is_active",
        "geocode_status",
        "user",
    )
    list_filter = ("is_active", "geocode_status")
    search_fields = ("name", "phone", "email", "address")
    inlines = [ClientNoteInline, ClientPhotoInline]


@admin.register(AppointmentSeries)
class AppointmentSeriesAdmin(admin.ModelAdmin):
    list_display = (
        "client",
        "frequency",
        "start_date",
        "default_time",
        "end_date",
        "generated_until",
    )
    list_filter = ("frequency",)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "client",
        "scheduled_date",
        "scheduled_time",
        "kind",
        "status",
        "price",
        "paid",
        "series",
    )
    list_filter = ("kind", "status", "paid")
    date_hierarchy = "scheduled_date"
    inlines = [JobPhotoInline]


@admin.register(AppBuild)
class AppBuildAdmin(admin.ModelAdmin):
    list_display = ("platform", "version", "version_code", "created_at")
    list_filter = ("platform",)
