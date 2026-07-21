from django.contrib import admin

from core.models import AppBuild, AppointmentSeries, BusinessProfile, Client, Job


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
        "status",
        "price",
        "paid",
        "series",
    )
    list_filter = ("status", "paid")
    date_hierarchy = "scheduled_date"


@admin.register(AppBuild)
class AppBuildAdmin(admin.ModelAdmin):
    list_display = ("platform", "version", "version_code", "created_at")
    list_filter = ("platform",)
