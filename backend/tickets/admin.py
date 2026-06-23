from django.contrib import admin
from .models import (
    UserProfile, Token, Ticket, ConfigFile, V2RayConfig, Telegram,
    PermanentNote, ChecklistItem, AssignedTask, EmployeeTodo,
    DailyGoal, EventTemplate, Exercise, Report, ReportImage, Submission,
    Notification, ChatRoom, ChatMessage, WorkingHours
)

@admin.register(WorkingHours)
class WorkingHoursAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'morning_check_in', 'morning_check_out', 
                    'afternoon_check_in', 'afternoon_check_out', 'is_currently_working', 'current_shift']
    list_filter = ['date', 'is_currently_working', 'current_shift']
    search_fields = ['user__username', 'user__email']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'date', 'rating', 'status', 'created_at']
    list_filter = ['status', 'rating', 'created_at']
    search_fields = ['user__username', 'user__email', 'report']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'submitted_at']
    list_filter = ['status', 'submitted_at']
    search_fields = ['user__username', 'user__email', 'note']
    date_hierarchy = 'submitted_at'
    ordering = ['-submitted_at']


@admin.register(ReportImage)
class ReportImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'report', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['report__user__username']
    date_hierarchy = 'uploaded_at'
    ordering = ['-uploaded_at']


@admin.register(AssignedTask)
class AssignedTaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'user', 'assigned_by', 'date', 'done', 'created_at']
    list_filter = ['done', 'date', 'created_at']
    search_fields = ['title', 'text', 'user__username', 'assigned_by__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(EmployeeTodo)
class EmployeeTodoAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'text', 'done', 'date', 'created_at']
    list_filter = ['done', 'date', 'created_at']
    search_fields = ['text', 'user__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(DailyGoal)
class DailyGoalAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'text', 'category', 'date', 'target_time', 'completed']
    list_filter = ['category', 'date', 'completed']
    search_fields = ['text', 'user__username']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(EventTemplate)
class EventTemplateAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'name', 'title', 'color', 'created_at']
    list_filter = ['color', 'created_at']
    search_fields = ['name', 'title', 'user__username']
    ordering = ['created_at']


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['content', 'user__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(PermanentNote)
class PermanentNoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['title', 'content', 'user__username']
    date_hierarchy = 'created_at'
    ordering = ['-updated_at']


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'text', 'completed', 'created_at']
    list_filter = ['completed', 'created_at']
    search_fields = ['text', 'user__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'message', 'is_read', 'is_saved', 'created_at']
    list_filter = ['is_read', 'is_saved', 'created_at']
    search_fields = ['message', 'user__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'user1', 'user2', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user1__username', 'user2__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'chat_room', 'sender', 'timestamp', 'has_image']
    list_filter = ['timestamp']
    search_fields = ['message', 'sender__username']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def has_image(self, obj):
        return bool(obj.image)
    has_image.boolean = True
    has_image.short_description = 'Has Image'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'has_v2ray_access']
    list_filter = ['has_v2ray_access']
    search_fields = ['user__username', 'user__email']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'subject', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['subject', 'description', 'user__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(ConfigFile)
class ConfigFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'recipient', 'target_role', 'is_public', 'uploaded_at']
    list_filter = ['is_public', 'target_role', 'uploaded_at']
    search_fields = ['name', 'recipient__username']
    date_hierarchy = 'uploaded_at'
    ordering = ['-uploaded_at']


@admin.register(V2RayConfig)
class V2RayConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'text']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(Telegram)
class TelegramAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'bot_name', 'is_active', 'bot_status', 'send_task_notifications']
    list_filter = ['is_active', 'bot_status', 'send_task_notifications', 'send_log', 'send_report']
    search_fields = ['bot_name', 'user__username', 'api_token']
    ordering = ['user__username']


@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    list_display = ['key', 'user', 'created']
    list_filter = ['created']
    search_fields = ['user__username', 'key']
    date_hierarchy = 'created'
    ordering = ['-created']
