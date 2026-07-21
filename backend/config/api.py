from ninja import NinjaAPI
from ninja.security import django_auth

from core.api import router as core_router
from core.api_clients import router as clients_router
from core.api_equipment import router as equipment_router
from core.api_notifications import router as notifications_router
from core.api_route import router as route_router
from core.api_schedule import router as schedule_router

api = NinjaAPI(
    title="Trade Management API",
    version="0.1.0",
    auth=django_auth,
    docs_url="/docs",
)

api.add_router("", core_router)
api.add_router("", clients_router)
api.add_router("", schedule_router)
api.add_router("", route_router)
api.add_router("", equipment_router)
api.add_router("", notifications_router)
