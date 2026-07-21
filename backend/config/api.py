from ninja import NinjaAPI
from ninja.security import django_auth

from core.api import router as core_router

api = NinjaAPI(
    title="Trade Management API",
    version="0.1.0",
    auth=django_auth,
    docs_url="/docs",
)

api.add_router("", core_router)
