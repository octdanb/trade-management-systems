from django.middleware.csrf import get_token
from ninja import Router

from core.schemas import HealthOut, UserOut

router = Router()


@router.get("/health", response=HealthOut, auth=None, operation_id="health")
def health(request):
    """Liveness check. Also ensures the CSRF cookie is set for the SPA."""
    get_token(request)
    return {"status": "ok"}


@router.get("/me", response=UserOut, operation_id="getMe")
def me(request):
    return request.auth
