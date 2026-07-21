from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router

from core.models import Trade
from core.schemas import HealthOut, TradeIn, TradeOut, UserOut

router = Router()


@router.get("/health", response=HealthOut, auth=None, operation_id="health")
def health(request):
    """Liveness check. Also ensures the CSRF cookie is set for the SPA."""
    get_token(request)
    return {"status": "ok"}


@router.get("/me", response=UserOut, operation_id="getMe")
def me(request):
    return request.auth


@router.get("/trades", response=list[TradeOut], operation_id="listTrades")
def list_trades(request):
    return Trade.objects.filter(user=request.auth)


@router.post("/trades", response={201: TradeOut}, operation_id="createTrade")
def create_trade(request, payload: TradeIn):
    data = payload.dict()
    if data.get("executed_at") is None:
        data["executed_at"] = timezone.now()
    trade = Trade.objects.create(user=request.auth, **data)
    return 201, trade


@router.delete("/trades/{trade_id}", response={204: None}, operation_id="deleteTrade")
def delete_trade(request, trade_id: int):
    trade = get_object_or_404(Trade, id=trade_id, user=request.auth)
    trade.delete()
    return 204, None
