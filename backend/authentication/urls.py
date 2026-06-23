from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'attendance', views.WorkingHoursViewSet, basename='attendance')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/update-profile/', views.update_profile, name='auth-update-profile'),
    path('auth/me/', views.me, name='auth-me'),
    path('update-profile/', views.update_profile, name='update-profile'),
    path('telegram/', views.get_telegram_data, name='get-telegram-data'),
    path('telegram/update/', views.update_telegram_data, name='update-telegram-data'),
    path('telegram/bots/', views.list_telegram_bots, name='list-telegram-bots'),
    path('telegram/delete/<int:bot_id>/', views.delete_telegram_bot, name='delete-telegram-bot'),
    path('database/export/', views.export_database, name='export-database'),
    path('database/import/', views.import_database, name='import-database'),
    path('telegram/start/', views.start_telegram, name='start-telegram'),
    path('telegram/pause/', views.pause_telegram, name='pause-telegram'),
    path('telegram/restart/', views.restart_telegram, name='restart-telegram'),
    path('telegram/webhook/', views.telegram_webhook, name='telegram-webhook'),
    path('team/', views.team_list, name='team-list'),
    path('team/update-user/', views.update_user, name='team-update-user'),
    path('team/unassigned-users/', views.unassigned_users, name='team-unassigned-users'),
    path('users/delete/<int:user_id>/', views.delete_user, name='delete-user'),
    path('working-hours/', views.get_working_hours, name='get-working-hours'),
    path('working-hours/check-in/', views.check_in, name='check-in'),
    path('working-hours/check-out/', views.check_out, name='check-out'),
]
