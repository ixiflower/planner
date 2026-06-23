from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = [
        ("None", "None"),
        ("Leader", "Leader"),
        ("Mod", "Mod"),
        ("Member", "Member"),
    ]

    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    team_role = models.CharField(max_length=16, choices=ROLE_CHOICES, default="None")
    telegram_id = models.CharField(max_length=64, null=True, blank=True)
    admin_task_list = models.JSONField(default=list, blank=True)
    developer = models.BooleanField(default=False)
    is_validate = models.BooleanField(default=False)
    can_see_work_hours = models.BooleanField(default=False)
    bio = models.TextField(max_length=500, blank=True, null=True)
    last_seen = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return self.username

    @property
    def name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username

    @property
    def profile_picture_url(self):
        if self.profile_picture:
            return self.profile_picture.url
        return None

    def is_online(self):
        """
        Check if user is currently online (last seen within last minute)
        """
        if self.last_seen:
            return (timezone.now() - self.last_seen).seconds < 60  # 1 minute
        return False