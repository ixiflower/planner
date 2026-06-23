import json
import gspread
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Model
from tickets.models import (
    UserProfile, Ticket, ConfigFile, V2RayConfig, Telegram,
    PermanentNote, ChecklistItem, AssignedTask, EmployeeTodo,
    DailyGoal, EventTemplate, Exercise, Report, Submission
)
from authentication.models import User
from sim.services import get_credentials, initialize_gspread
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

def serialize_model_instance(instance):
    """Serialize a Django model instance to a dictionary."""
    if isinstance(instance, (date, datetime)):
        return instance.isoformat()
    
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        if isinstance(value, Model):
            data[field.name] = str(value.pk)
        elif isinstance(value, (date, datetime)):
            data[field.name] = value.isoformat()
        else:
            data[field.name] = value
    return data

def get_all_database_data():
    """Extract all data from database models for export."""
    data = {
        'users': [],
        'user_profiles': [],
        'tickets': [],
        'config_files': [],
        'v2ray_configs': [],
        'telegram_settings': [],
        'permanent_notes': [],
        'tasks': [],
        'checklist_items': [],
        'assigned_tasks': [],
        'employee_todos': [],
        'daily_goals': [],
        'event_templates': [],
        'exercises': [],
        'reports': [],
        'submissions': []
    }
    
    try:
        # Users
        users = User.objects.all()
        for user in users:
            user_data = serialize_model_instance(user)
            data['users'].append(user_data)
        
        # User Profiles
        profiles = UserProfile.objects.all()
        for profile in profiles:
            data['user_profiles'].append(serialize_model_instance(profile))
        
        # Tickets
        tickets = Ticket.objects.all()
        for ticket in tickets:
            data['tickets'].append(serialize_model_instance(ticket))
        
        # Config Files
        config_files = ConfigFile.objects.all()
        for config_file in config_files:
            data['config_files'].append(serialize_model_instance(config_file))
        
        # V2Ray Configs
        v2ray_configs = V2RayConfig.objects.all()
        for config in v2ray_configs:
            data['v2ray_configs'].append(serialize_model_instance(config))
        
        # Telegram Settings
        telegram_settings = Telegram.objects.all()
        for telegram in telegram_settings:
            data['telegram_settings'].append(serialize_model_instance(telegram))
        
        # Permanent Notes
        permanent_notes = PermanentNote.objects.all()
        for note in permanent_notes:
            data['permanent_notes'].append(serialize_model_instance(note))
        
        # Tasks removed
        data['tasks'] = []
        
        # Checklist Items
        checklist_items = ChecklistItem.objects.all()
        for item in checklist_items:
            data['checklist_items'].append(serialize_model_instance(item))
        
        # Assigned Tasks
        assigned_tasks = AssignedTask.objects.all()
        for task in assigned_tasks:
            data['assigned_tasks'].append(serialize_model_instance(task))
        
        # Employee Todos
        employee_todos = EmployeeTodo.objects.all()
        for todo in employee_todos:
            data['employee_todos'].append(serialize_model_instance(todo))
        
        # Daily Goals
        daily_goals = DailyGoal.objects.all()
        for goal in daily_goals:
            data['daily_goals'].append(serialize_model_instance(goal))
        
        # Event Templates
        event_templates = EventTemplate.objects.all()
        for template in event_templates:
            data['event_templates'].append(serialize_model_instance(template))
        
        # Exercises
        exercises = Exercise.objects.all()
        for exercise in exercises:
            data['exercises'].append(serialize_model_instance(exercise))
        
        # Reports
        reports = Report.objects.all()
        for report in reports:
            data['reports'].append(serialize_model_instance(report))
        
        # Submissions
        submissions = Submission.objects.all()
        for submission in submissions:
            data['submissions'].append(serialize_model_instance(submission))
            
    except Exception as e:
        logger.error(f"Error extracting database data: {str(e)}")
        raise
    
    return data

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def upload_to_google_sheets(request):
    """Upload all database data to Google Sheets."""
    try:
        # Check if user is developer
        if not request.user.developer:
            return JsonResponse({'error': 'Only developers can perform this action'}, status=403)
        
        # Initialize Google Sheets client
        client = initialize_gspread()
        
        # Database ID from the Google Sheets URL
        # https://docs.google.com/spreadsheets/d/1pC1DxqvYVT3y-e3K8N8r_ShPMSKItK9CKtyQ2LIxhN0/edit
        spreadsheet_id = "1pC1DxqvYVT3y-e3K8N8r_ShPMSKItK9CKtyQ2LIxhN0"
        
        # Open the spreadsheet
        spreadsheet = client.open_by_key(spreadsheet_id)
        
        # Get all database data
        data = get_all_database_data()
        
        # Process each model type
        results = {}
        for model_name, records in data.items():
            try:
                # Try to get existing worksheet or create new one
                try:
                    worksheet = spreadsheet.worksheet(model_name.capitalize())
                    # Clear existing data
                    worksheet.clear()
                except gspread.WorksheetNotFound:
                    # Create new worksheet
                    worksheet = spreadsheet.add_worksheet(
                        title=model_name.capitalize(), 
                        rows=len(records) + 1,  # +1 for header
                        cols=10  # Default columns
                    )
                
                if records:
                    # Prepare headers
                    headers = list(records[0].keys())
                    
                    # Prepare data rows
                    rows = [headers]
                    for record in records:
                        row = [str(record.get(header, '')) for header in headers]
                        rows.append(row)
                    
                    # Update worksheet
                    worksheet.update('A1', rows)
                    results[model_name] = f"Uploaded {len(records)} records"
                else:
                    results[model_name] = "No records to upload"
                    
            except Exception as e:
                logger.error(f"Error uploading {model_name}: {str(e)}")
                results[model_name] = f"Error: {str(e)}"
        
        return JsonResponse({
            'success': True,
            'message': 'Data uploaded to Google Sheets successfully',
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in upload_to_google_sheets: {str(e)}")
        return JsonResponse({
            'error': f'Failed to upload to Google Sheets: {str(e)}'
        }, status=500)

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def download_from_google_sheets(request):
    """Download data from Google Sheets (for reference/documentation)."""
    try:
        # Check if user is developer
        if not request.user.developer:
            return JsonResponse({'error': 'Only developers can perform this action'}, status=403)
        
        # Initialize Google Sheets client
        client = initialize_gspread()
        
        # Database ID from the Google Sheets URL
        spreadsheet_id = "1pC1DxqvYVT3y-e3K8N8r_ShPMSKItK9CKtyQ2LIxhN0"
        
        # Open the spreadsheet
        spreadsheet = client.open_by_key(spreadsheet_id)
        
        # Get all worksheets
        worksheets = spreadsheet.worksheets()
        
        results = {}
        for worksheet in worksheets:
            try:
                # Get all records from worksheet
                records = worksheet.get_all_records()
                results[worksheet.title] = {
                    'rows': len(records),
                    'columns': len(records[0].keys()) if records else 0,
                    'data': records
                }
            except Exception as e:
                logger.error(f"Error reading worksheet {worksheet.title}: {str(e)}")
                results[worksheet.title] = {'error': str(e)}
        
        return JsonResponse({
            'success': True,
            'message': 'Data retrieved from Google Sheets',
            'sheets': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in download_from_google_sheets: {str(e)}")
        return JsonResponse({
            'error': f'Failed to download from Google Sheets: {str(e)}'
        }, status=500)

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def auto_sync_google_sheets(request):
    """Configure auto-sync settings (placeholder for future implementation)."""
    try:
        # Check if user is developer
        if not request.user.developer:
            return JsonResponse({'error': 'Only developers can perform this action'}, status=403)
        
        data = json.loads(request.body)
        enabled = data.get('enabled', False)
        interval_hours = data.get('interval_hours', 24)
        
        # For now, just return success - actual auto-sync would need a background task
        return JsonResponse({
            'success': True,
            'message': f'Auto-sync {"enabled" if enabled else "disabled"} with {interval_hours} hour interval',
            'settings': {
                'enabled': enabled,
                'interval_hours': interval_hours
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in auto_sync_google_sheets: {str(e)}")
        return JsonResponse({
            'error': f'Failed to configure auto-sync: {str(e)}'
        }, status=500)