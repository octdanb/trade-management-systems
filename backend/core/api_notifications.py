from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router

from core.models import Notification, PushDevice
from core.schemas import NotificationOut, PushDeviceIn, PushDeviceOut, ReminderOut
from core.services import reminders

router = Router(tags=["notifications"])


@router.get("/reminders", response=list[ReminderOut], operation_id="listReminders")
def list_reminders(request):
    """Equipment due (or nearly due) for service, computed live."""
    today = timezone.localdate()
    return [
        {
            "equipment_id": item.id,
            "equipment_name": item.name,
            "due_on": item.next_service_due,
            "days_until": (item.next_service_due - today).days,
            "overdue": item.next_service_due < today,
            "service_contact_name": item.service_contact_name,
            "service_contact_phone": item.service_contact_phone,
        }
        for item in reminders.due_equipment(request.auth)
    ]


@router.post("/reminders/run", response=list[NotificationOut], operation_id="runReminders")
def run_reminders(request):
    """
    Trigger reminder generation for the current user now (what the daily
    `send_due_reminders` job does). Returns the notifications it created.
    """
    return reminders.generate_service_reminders(request.auth)


@router.get("/notifications", response=list[NotificationOut], operation_id="listNotifications")
def list_notifications(request, unread: bool | None = None, limit: int = 50):
    qs = Notification.objects.filter(user=request.auth)
    if unread is True:
        qs = qs.filter(read_at__isnull=True)
    elif unread is False:
        qs = qs.filter(read_at__isnull=False)
    return qs[: max(1, min(limit, 200))]


@router.post(
    "/notifications/{notification_id}/read",
    response=NotificationOut,
    operation_id="markNotificationRead",
)
def mark_notification_read(request, notification_id: int):
    notification = get_object_or_404(Notification, id=notification_id, user=request.auth)
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=["read_at"])
    return notification


@router.post(
    "/notifications/read-all", response={204: None}, operation_id="markAllNotificationsRead"
)
def mark_all_notifications_read(request):
    Notification.objects.filter(user=request.auth, read_at__isnull=True).update(
        read_at=timezone.now()
    )
    return 204, None


@router.post("/devices", response={201: PushDeviceOut}, operation_id="registerPushDevice")
def register_push_device(request, payload: PushDeviceIn):
    """
    Register a device token for push notifications. The React Native app will
    call this with its FCM/APNs token; delivery is mocked for now (see
    core.services.notifications).
    """
    device, _ = PushDevice.objects.update_or_create(
        user=request.auth, token=payload.token, defaults={"platform": payload.platform}
    )
    return 201, device


@router.delete("/devices/{device_id}", response={204: None}, operation_id="unregisterPushDevice")
def unregister_push_device(request, device_id: int):
    get_object_or_404(PushDevice, id=device_id, user=request.auth).delete()
    return 204, None
