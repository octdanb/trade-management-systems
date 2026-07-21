"""
Push notification pipeline — MOCK transport.

`send_push` is the single entry point callers use. Today it writes a
Notification row (which also feeds the in-app bell) and logs what a real
push would look like. When the React Native app lands, wire the real
FCM/APNs delivery to the registered PushDevice tokens here — callers don't
change.
"""

import logging

from core.models import Notification, PushDevice

logger = logging.getLogger(__name__)


def send_push(user, title: str, body: str = "", data: dict | None = None) -> Notification:
    notification = Notification.objects.create(user=user, title=title, body=body, data=data or {})
    tokens = list(PushDevice.objects.filter(user=user).values_list("token", flat=True))
    # MOCK: real implementation would fan out to FCM/APNs per token here.
    logger.info(
        "[mock push] to user=%s devices=%d title=%r body=%r data=%r",
        user.pk,
        len(tokens),
        title,
        body,
        data or {},
    )
    return notification
