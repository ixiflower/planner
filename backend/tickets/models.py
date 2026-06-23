from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import secrets

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    is_v2ray_admin = models.BooleanField(default=False, help_text="User can manage V2Ray configurations")
    has_v2ray_access = models.BooleanField(default=True, help_text="User can access V2Ray page and features")
    daily_events_json = models.TextField(blank=True, null=True, help_text="JSON representation of user's daily calendar events")
    notepad_content = models.TextField(blank=True, null=True, help_text="User's personal notepad content")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - V2Ray Admin: {self.is_v2ray_admin}"
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

class Token(models.Model):
    key = models.CharField(max_length=50, unique=True)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name='auth_token', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super().save(*args, **kwargs)
    
    def generate_key(self):
        return secrets.token_urlsafe(32)
    
    def __str__(self):
        return self.key


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)

def create_auth_token(sender, instance, created, **kwargs):
    if created:
        Token.objects.create(user=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.subject} - {self.user.username}"
    
    class Meta:
        ordering = ['-created_at']

class ConfigFile(models.Model):
    name = models.CharField(max_length=200)
    file = models.FileField(upload_to='config_files/')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_files')
    is_public = models.BooleanField(default=False)
    target_role = models.CharField(max_length=50, blank=True, null=True, help_text="Target role (e.g., Leader, Mod, Member)")
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-uploaded_at']

class V2RayConfig(models.Model):
    STATUS_CHOICES = [
        ('on', 'On'),
        ('off', 'Off'),
    ]
    
    title = models.CharField(max_length=200)
    text = models.TextField()
    status = models.CharField(max_length=3, choices=STATUS_CHOICES, default='off')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Telegram(models.Model):
    is_active = models.BooleanField(default=False)
    bot_name = models.CharField(max_length=100, blank=True, null=True)
    api_token = models.CharField(max_length=200, blank=True, null=True)
    send_log = models.BooleanField(default=False)
    send_report = models.BooleanField(default=False)
    send_tasks = models.BooleanField(default=False)
    send_dollar_price = models.BooleanField(default=False)
    send_gold_price = models.BooleanField(default=False)
    send_reports = models.BooleanField(default=False)
    send_team = models.BooleanField(default=False)
    send_submissions = models.BooleanField(default=False)
    send_task_notifications = models.BooleanField(default=True, help_text="Send notifications when tasks are assigned")
    dollar_price_cmd = models.CharField(max_length=50, default='/dollar')
    gold_price_cmd = models.CharField(max_length=50, default='/gold')
    
    sae_data_enabled = models.BooleanField(default=False, help_text="Enable saving website data to Telegram")
    sae_automation_interval = models.IntegerField(default=5, help_text="Automation interval in hours for SAE data sync")
    
    google_sheets_auto_sync_enabled = models.BooleanField(default=False, help_text="Enable automatic sync with Google Sheets")
    google_sheets_sync_interval = models.IntegerField(default=10, help_text="Google Sheets sync interval in hours")
    bot_status = models.CharField(
        max_length=20,
        choices=[('start', 'Start'), ('restart', 'Restart'), ('pause', 'Pause'), ('idle', 'Idle')],
        default='idle'
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='telegram'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Telegram({self.bot_name}) for {self.user.username}"

    class Meta:
        verbose_name = "Telegram Bot"
        verbose_name_plural = "Telegram Bots"

class PermanentNote(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='permanent_notes')
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Note by {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Permanent Note"
        verbose_name_plural = "Permanent Notes"


class ChecklistItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='checklist_items')
    text = models.CharField(max_length=500)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.text} - {self.user.username}"
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Checklist Item"
        verbose_name_plural = "Checklist Items"

class AssignedTask(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_tasks')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_tasks_created')
    title = models.CharField(max_length=200, blank=True, null=True)
    text = models.CharField(max_length=500)
    done = models.BooleanField(default=False)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.text[:30]} - {self.user.username} ({self.date})"

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Assigned Task"
        verbose_name_plural = "Assigned Tasks"

class EmployeeTodo(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='employee_todos')
    text = models.CharField(max_length=500)
    done = models.BooleanField(default=False)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.text[:30]} - {self.user.username} ({self.date})"

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Employee Todo"
        verbose_name_plural = "Employee Todos"

class DailyGoal(models.Model):
    COLOR_CHOICES = [
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('red', 'Red'),
        ('yellow', 'Yellow'),
        ('purple', 'Purple'),
        ('orange', 'Orange'),
        ('gray', 'Gray'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_goals')
    text = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    date = models.DateField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    category = models.CharField(max_length=50, default='personal')
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='blue')
    notes = models.TextField(blank=True)
    target_time = models.IntegerField(null=True, blank=True)  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.text} ({self.date}) - {self.user.username}"

    class Meta:
        ordering = ['date', 'created_at']
        unique_together = ('user', 'date', 'text')

class EventTemplate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_templates')
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    color = models.CharField(max_length=20, default='blue')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.user.username}"

    class Meta:
        ordering = ['created_at']

class Exercise(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exercises')
    content = models.TextField(help_text="Exercise content with formatting")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Exercise by {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Exercise"
        verbose_name_plural = "Exercises"

class Report(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports')
    tasks = models.TextField(help_text='JSON serialized list of tasks')
    note = models.TextField(blank=True, null=True)
    note_type = models.CharField(max_length=10, default='text')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating = models.IntegerField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report by {getattr(self.user, 'username', '')}"

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = "Report"
        verbose_name_plural = "Reports"


class ReportImage(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='report_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Report #{self.report.id}"

    class Meta:
        ordering = ['uploaded_at']
        verbose_name = "Report Image"
        verbose_name_plural = "Report Images"


class Submission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    date = models.DateField()
    report = models.TextField()
    rating = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Submission by {self.user.username} on {self.date}"

    class Meta:
        ordering = ['-date']
        verbose_name = "Submission"
        verbose_name_plural = "Submissions"

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    link = models.URLField(max_length=500, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    is_saved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:50]}..."

class ChatRoom(models.Model):
    # Direct message fields
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_rooms_as_user1',
        null=True,
        blank=True,
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_rooms_as_user2',
        null=True,
        blank=True,
    )

    # Group room fields (e.g. #general)
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=255, null=True, blank=True)
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='group_chat_rooms',
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.is_group:
            return f"Group chat: {self.name or self.slug or self.id}"
        return f"Chat between {getattr(self.user1, 'username', 'N/A')} and {getattr(self.user2, 'username', 'N/A')}"

    class Meta:
        ordering = ['-updated_at']

class ChatMessage(models.Model):
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    message = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_saved = models.BooleanField(default=False, help_text="Whether this message is saved by the sender")
    saved_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='saved_messages', blank=True, help_text="Users who saved this message")

    def __str__(self):
        return f"Message by {self.sender.username} at {self.timestamp}"

    class Meta:
        ordering = ['timestamp']

class WorkingHours(models.Model):
    STATUS_CHOICES = [
        ('complete', 'Complete'),
        ('absent', 'Absent'),
        ('partial', 'Partial'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='working_hours')
    date = models.DateField(default=timezone.now)
    # Morning shift: 9:00-13:00
    morning_check_in = models.DateTimeField(null=True, blank=True)
    morning_check_out = models.DateTimeField(null=True, blank=True)
    morning_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='absent')
    morning_partial_time = models.TimeField(null=True, blank=True)
    
    # Afternoon shift: 15:00-19:00
    afternoon_check_in = models.DateTimeField(null=True, blank=True)
    afternoon_check_out = models.DateTimeField(null=True, blank=True)
    afternoon_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='absent')
    afternoon_partial_time = models.TimeField(null=True, blank=True)
    
    # Track current status
    is_currently_working = models.BooleanField(default=False)
    current_shift = models.CharField(max_length=10, choices=[('morning', 'Morning'), ('afternoon', 'Afternoon')], null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.date}"

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ['user', 'date']
        verbose_name = "Working Hours"
        verbose_name_plural = "Working Hours"

class Group(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_groups')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='GroupMembership', related_name='user_groups')
    invite_code = models.CharField(max_length=20, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_public = models.BooleanField(default=False, help_text="Public groups can be found and joined by anyone")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invite_code:
            # Generate a 6-digit numeric code
            self.invite_code = ''.join(secrets.choice('0123456789') for _ in range(6))
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Group"
        verbose_name_plural = "Groups"

class GroupMembership(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.group.name} ({self.role})"

    class Meta:
        unique_together = ['user', 'group']
        ordering = ['-joined_at']
        verbose_name = "Group Membership"
        verbose_name_plural = "Group Memberships"

class StructureBoard(models.Model):
    code = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=200, default='New Board')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_boards')
    data = models.TextField(default='{"nodes": [], "edges": []}', help_text="JSON data of the board")
    collaborators = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='shared_boards', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"
