from datetime import datetime
from decimal import Decimal

from ninja import Schema

from core.models import Trade


class UserOut(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str


class HealthOut(Schema):
    status: str


class TradeIn(Schema):
    symbol: str
    side: Trade.Side
    quantity: Decimal
    price: Decimal
    executed_at: datetime | None = None


class TradeOut(Schema):
    id: int
    symbol: str
    side: Trade.Side
    quantity: Decimal
    price: Decimal
    executed_at: datetime
    created_at: datetime
