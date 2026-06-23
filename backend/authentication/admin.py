from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from tickets.models import AssignedTask, UserProfile, Submission

User = get_user_model()

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

class AssignedTaskInline(admin.TabularInline):
    model = AssignedTask
    fk_name = "user"
    extra = 1

class SubmissionInline(admin.TabularInline):
    model = Submission
    fk_name = "user"
    extra = 0
    readonly_fields = ("created_at", "updated_at")

# Check if the User model is already registered to avoid conflicts
if not admin.site.is_registered(User):
    @admin.register(User)
    class CustomUserAdmin(UserAdmin):
        list_display = UserAdmin.list_display + ('team_role', 'telegram_id', 'developer', 'is_validate')
        fieldsets = UserAdmin.fieldsets + (
            ('Additional Info', {'fields': ('profile_picture', 'team_role', 'telegram_id', 'developer', 'is_validate', 'admin_task_list', 'last_seen')}),
        )
        add_fieldsets = UserAdmin.add_fieldsets + (
            ('Additional Info', {'fields': ('profile_picture', 'team_role', 'telegram_id', 'developer', 'is_validate', 'admin_task_list')}),
        )
        list_filter = UserAdmin.list_filter + ('team_role', 'developer', 'is_validate')
        inlines = [UserProfileInline, AssignedTaskInline, SubmissionInline]
