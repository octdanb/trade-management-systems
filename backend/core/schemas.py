from datetime import date, datetime, time
from decimal import Decimal

from ninja import Schema

from core.models import AppointmentSeries, GeocodeStatus, Job


class HealthOut(Schema):
    status: str


class UserOut(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str


# --- Clients -----------------------------------------------------------------


class ClientIn(Schema):
    name: str
    phone: str = ""
    email: str = ""
    address: str = ""
    notes: str = ""
    rate: Decimal
    cost: Decimal = Decimal("0")
    is_active: bool = True


class ClientOut(Schema):
    id: int
    name: str
    phone: str
    email: str
    address: str
    notes: str
    rate: Decimal
    cost: Decimal
    is_active: bool
    lat: float | None
    lng: float | None
    geocode_status: GeocodeStatus
    created_at: datetime
    updated_at: datetime


# --- Business profile --------------------------------------------------------


class ProfileIn(Schema):
    business_name: str = ""
    home_address: str = ""


class ProfileOut(Schema):
    business_name: str
    home_address: str
    home_lat: float | None
    home_lng: float | None
    geocode_status: GeocodeStatus


# --- Appointment series ------------------------------------------------------


class SeriesIn(Schema):
    client_id: int
    frequency: AppointmentSeries.Frequency
    start_date: date
    default_time: time | None = None
    duration_minutes: int = 60
    end_date: date | None = None


class SeriesUpdateIn(Schema):
    frequency: AppointmentSeries.Frequency
    default_time: time | None = None
    duration_minutes: int = 60
    end_date: date | None = None


class SeriesOut(Schema):
    id: int
    client_id: int
    client_name: str
    frequency: AppointmentSeries.Frequency
    start_date: date
    default_time: time | None
    duration_minutes: int
    end_date: date | None

    @staticmethod
    def resolve_client_name(obj):
        return obj.client.name


class SeriesEndIn(Schema):
    end_date: date


# --- Jobs --------------------------------------------------------------------


class JobIn(Schema):
    """A one-off job. Series occurrences are created via the series endpoints."""

    client_id: int
    scheduled_date: date
    scheduled_time: time | None = None
    duration_minutes: int = 60
    price: Decimal | None = None  # defaults to the client's rate
    notes: str = ""


class JobUpdateIn(Schema):
    """Partial update; only provided fields are applied."""

    scheduled_date: date | None = None
    scheduled_time: time | None = None
    duration_minutes: int | None = None
    status: Job.Status | None = None
    price: Decimal | None = None
    paid: bool | None = None
    notes: str | None = None


class JobOut(Schema):
    id: int
    client_id: int
    client_name: str
    series_id: int | None
    scheduled_date: date
    scheduled_time: time | None
    duration_minutes: int
    status: Job.Status
    price: Decimal
    paid: bool
    notes: str
    route_order: int | None

    @staticmethod
    def resolve_client_name(obj):
        return obj.client.name


# --- Route planning ----------------------------------------------------------


class LatLng(Schema):
    lat: float
    lng: float


class RouteStopOut(JobOut):
    address: str
    lat: float | None
    lng: float | None
    leg_duration_s: float | None = None

    @staticmethod
    def resolve_address(obj):
        return obj.client.address

    @staticmethod
    def resolve_lat(obj):
        return obj.client.lat

    @staticmethod
    def resolve_lng(obj):
        return obj.client.lng


class RoutePlanOut(Schema):
    date: date
    home: LatLng | None
    stops: list[RouteStopOut]
    unrouted: list[RouteStopOut]
    total_duration_s: float | None
    used_fallback_matrix: bool


class RouteOptimizeIn(Schema):
    date: date


class RouteReorderIn(Schema):
    date: date
    job_ids: list[int]
