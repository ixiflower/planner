from django.shortcuts import render
from django.http import JsonResponse
from .services import get_all_rows
 
def photo_wall(request):
  """API Documentation Page - Lists all available API endpoints"""
  
  api_endpoints = [
    {
      "category": "Authentication",
      "endpoints": [
        {"method": "POST", "path": "/authentication/api/register/", "description": "Register a new user"},
        {"method": "POST", "path": "/authentication/api/login/", "description": "Login and get auth token"},
        {"method": "POST", "path": "/authentication/api/logout/", "description": "Logout user"},
        {"method": "GET", "path": "/authentication/api/user/", "description": "Get current user info"},
        {"method": "PUT", "path": "/authentication/api/user/", "description": "Update user profile"},
        {"method": "POST", "path": "/authentication/api/upload-profile-pic/", "description": "Upload profile picture"},
      ]
    },
    {
      "category": "Tasks & Calendar",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/tasks/", "description": "Get all tasks for current user"},
        {"method": "POST", "path": "/tickets/api/tasks/", "description": "Create a new task"},
        {"method": "GET", "path": "/tickets/api/tasks/{id}/", "description": "Get task details"},
        {"method": "PUT", "path": "/tickets/api/tasks/{id}/", "description": "Update a task"},
        {"method": "DELETE", "path": "/tickets/api/tasks/{id}/", "description": "Delete a task"},
        {"method": "GET", "path": "/tickets/api/daily-goals/", "description": "Get daily goals"},
        {"method": "POST", "path": "/tickets/api/daily-goals/", "description": "Create daily goal"},
        {"method": "PUT", "path": "/tickets/api/daily-goals/{id}/", "description": "Update daily goal"},
        {"method": "DELETE", "path": "/tickets/api/daily-goals/{id}/", "description": "Delete daily goal"},
      ]
    },
    {
      "category": "Submissions & Reports",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/submissions/", "description": "Get submissions (filtered by date)"},
        {"method": "POST", "path": "/tickets/api/submissions/", "description": "Create a submission"},
        {"method": "GET", "path": "/tickets/api/submissions/{id}/", "description": "Get submission details"},
        {"method": "PUT", "path": "/tickets/api/submissions/{id}/", "description": "Update submission (admin only)"},
        {"method": "DELETE", "path": "/tickets/api/submissions/{id}/", "description": "Delete submission (owner/admin/developer)"},
        {"method": "GET", "path": "/tickets/api/reports/", "description": "Get reports"},
        {"method": "POST", "path": "/tickets/api/reports/", "description": "Create a report"},
        {"method": "GET", "path": "/tickets/api/reports/{id}/", "description": "Get report details"},
        {"method": "PUT", "path": "/tickets/api/reports/{id}/", "description": "Update report"},
        {"method": "DELETE", "path": "/tickets/api/reports/{id}/", "description": "Delete report"},
      ]
    },
    {
      "category": "Team Management",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/team-members/", "description": "Get all team members"},
        {"method": "POST", "path": "/tickets/api/team-members/update-role/", "description": "Update member role (leader only)"},
        {"method": "GET", "path": "/tickets/api/assigned-tasks/", "description": "Get assigned tasks"},
        {"method": "POST", "path": "/tickets/api/assigned-tasks/", "description": "Create assigned task"},
        {"method": "PUT", "path": "/tickets/api/assigned-tasks/{id}/", "description": "Update assigned task"},
        {"method": "DELETE", "path": "/tickets/api/assigned-tasks/{id}/", "description": "Delete assigned task"},
      ]
    },
    {
      "category": "Chat & Notifications",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/chatrooms/", "description": "Get user's chat rooms"},
        {"method": "POST", "path": "/tickets/api/chatrooms/create/", "description": "Create or get chat room"},
        {"method": "GET", "path": "/tickets/api/chatrooms/{id}/messages/", "description": "Get chat messages"},
        {"method": "POST", "path": "/tickets/api/chatrooms/{id}/messages/", "description": "Send a message"},
        {"method": "POST", "path": "/tickets/api/chatrooms/{id}/mark-read/", "description": "Mark messages as read"},
        {"method": "GET", "path": "/tickets/api/notifications/", "description": "Get user notifications"},
        {"method": "POST", "path": "/tickets/api/notifications/{id}/read/", "description": "Mark notification as read"},
        {"method": "POST", "path": "/tickets/api/notifications/{id}/save/", "description": "Save/unsave notification"},
      ]
    },
    {
      "category": "V2Ray Configuration",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/v2ray-config/", "description": "Get V2Ray config (requires access)"},
        {"method": "POST", "path": "/tickets/api/upload-config/", "description": "Upload config file (admin only)"},
        {"method": "GET", "path": "/tickets/api/config-files/", "description": "Get available config files"},
        {"method": "DELETE", "path": "/tickets/api/config-files/{id}/", "description": "Delete config file (admin only)"},
      ]
    },
    {
      "category": "Telegram Bot (Admin/Developer)",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/telegram-settings/", "description": "Get telegram bot settings"},
        {"method": "POST", "path": "/tickets/api/telegram-settings/", "description": "Update telegram bot settings"},
        {"method": "POST", "path": "/tickets/api/telegram-bot-action/", "description": "Control bot (start/stop/restart)"},
        {"method": "GET", "path": "/tickets/api/telegram-bots/", "description": "Get all telegram bots"},
        {"method": "DELETE", "path": "/tickets/api/telegram-bots/{id}/", "description": "Delete telegram bot"},
      ]
    },
    {
      "category": "Google Sheets Integration (Admin/Developer)",
      "endpoints": [
        {"method": "POST", "path": "/tickets/api/google-sheets/upload/", "description": "Upload data to Google Sheets"},
        {"method": "POST", "path": "/tickets/api/google-sheets/download/", "description": "Download data from Google Sheets"},
        {"method": "POST", "path": "/tickets/api/google-sheets/toggle-auto-sync/", "description": "Toggle auto-sync"},
      ]
    },
    {
      "category": "Database Management (Admin/Developer)",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/database/export/", "description": "Export database to JSON"},
        {"method": "POST", "path": "/tickets/api/database/import/", "description": "Import database from JSON"},
      ]
    },
    {
      "category": "Exercise & Checklist",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/exercises/", "description": "Get user exercises"},
        {"method": "POST", "path": "/tickets/api/exercises/", "description": "Create exercise"},
        {"method": "PUT", "path": "/tickets/api/exercises/{id}/", "description": "Update exercise"},
        {"method": "DELETE", "path": "/tickets/api/exercises/{id}/", "description": "Delete exercise"},
        {"method": "GET", "path": "/tickets/api/checklist/", "description": "Get checklist items"},
        {"method": "POST", "path": "/tickets/api/checklist/", "description": "Create checklist item"},
        {"method": "PUT", "path": "/tickets/api/checklist/{id}/", "description": "Update checklist item"},
        {"method": "DELETE", "path": "/tickets/api/checklist/{id}/", "description": "Delete checklist item"},
      ]
    },
    {
      "category": "Permanent Notes",
      "endpoints": [
        {"method": "GET", "path": "/tickets/api/permanent-notes/", "description": "Get permanent notes"},
        {"method": "POST", "path": "/tickets/api/permanent-notes/", "description": "Create permanent note"},
        {"method": "PUT", "path": "/tickets/api/permanent-notes/{id}/", "description": "Update permanent note"},
        {"method": "DELETE", "path": "/tickets/api/permanent-notes/{id}/", "description": "Delete permanent note"},
      ]
    },
  ]
  
  if request.GET.get('format') == 'json':
    return JsonResponse({"apis": api_endpoints}, json_dumps_params={'indent': 2})
  
  return render(request, 'api_documentation.html', {'api_endpoints': api_endpoints})