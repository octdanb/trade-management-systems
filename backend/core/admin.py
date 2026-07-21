from django.contrib import admin

from core.models import Trade


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ("symbol", "side", "quantity", "price", "user", "executed_at")
    list_filter = ("side", "symbol")
