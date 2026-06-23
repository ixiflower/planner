from .models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()

def create_notification(user, message, link=None):
    """
    Creates and saves a new notification for the specified user.
    """
    if isinstance(user, User):
        Notification.objects.create(user=user, message=message, link=link)
    else:
        # Handle cases where user might be an ID or not a User instance
        try:
            target_user = User.objects.get(pk=user)
            Notification.objects.create(user=target_user, message=message, link=link)
        except User.DoesNotExist:
            print(f"Warning: Attempted to create notification for non-existent user: {user}")
