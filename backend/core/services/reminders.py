"""
Service-due reminders for equipment.

Reminders are computed from `Equipment.next_service_due` (no stored reminder
rows), and `generate_service_reminders` pushes each one through the (mock)
push pipeline at most once per equipment per day.
"""

from datetime import date

from django.utils import timezone

from core.models import Equipment, Notification
from core.services.notifications import send_push

# Start reminding this many days before the due date.
LEAD_DAYS = 7


def due_equipment(user, lead_days: int = LEAD_DAYS) -> list[Equipment]:
    """Active equipment whose next service is due within `lead_days` (or overdue)."""
    today = timezone.localdate()
    result = []
    for item in Equipment.objects.filter(user=user, status=Equipment.Status.ACTIVE).exclude(
        service_interval_days=None
    ):
        due = item.next_service_due
        if due is not None and (due - today).days <= lead_days:
            result.append(item)
    result.sort(key=lambda e: e.next_service_due)
    return result


def _reminder_payload(item: Equipment, today: date) -> tuple[str, str, dict]:
    due = item.next_service_due
    days = (due - today).days
    if days < 0:
        title = f"{item.name} service overdue"
        body = f"Service was due {-days} day{'s' if days != -1 else ''} ago ({due})."
    elif days == 0:
        title = f"{item.name} service due today"
        body = f"Scheduled service interval: every {item.service_interval_days} days."
    else:
        title = f"{item.name} service due in {days} day{'s' if days != 1 else ''}"
        body = f"Due {due}."
    if item.service_contact_name or item.service_contact_phone:
        contact = " ".join(filter(None, [item.service_contact_name, item.service_contact_phone]))
        body += f" Contact: {contact}."
    data = {"type": "equipment_service", "equipment_id": item.id, "due_on": str(due)}
    return title, body, data


def generate_service_reminders(user, lead_days: int = LEAD_DAYS) -> list[Notification]:
    """Send (mock) push reminders for due equipment, once per item per day."""
    today = timezone.localdate()
    created = []
    for item in due_equipment(user, lead_days):
        already_sent_today = Notification.objects.filter(
            user=user,
            data__type="equipment_service",
            data__equipment_id=item.id,
            created_at__date=today,
        ).exists()
        if already_sent_today:
            continue
        title, body, data = _reminder_payload(item, today)
        created.append(send_push(user, title, body, data))
    return created
