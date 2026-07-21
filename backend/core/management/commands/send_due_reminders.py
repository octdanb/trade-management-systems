from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.services import reminders


class Command(BaseCommand):
    """
    Generate service-due reminders for every user (once per item per day).
    Run daily via cron/scheduler in a real deployment, e.g.:
        python manage.py send_due_reminders
    """

    help = "Send (mock) push reminders for equipment that is due for service."

    def handle(self, *args, **options):
        total = 0
        for user in get_user_model().objects.filter(is_active=True):
            created = reminders.generate_service_reminders(user)
            total += len(created)
        self.stdout.write(self.style.SUCCESS(f"Sent {total} reminder(s)."))
