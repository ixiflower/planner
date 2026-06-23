from rest_framework import status, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from tickets.models import Token, UserProfile, WorkingHours, Submission, AssignedTask
from .serializers import WorkingHoursSerializer
from django.utils import timezone
from datetime import datetime, date
import json
import urllib.request
import urllib.error

User = get_user_model()

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def update_profile(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    data = request.data
    try:
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']
            user.save()
            return Response({
                'message': 'Profile picture updated successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': (user.get_full_name() or '').strip() or user.username,
                    'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
                    'is_staff': user.is_staff,
                    'telegram_id': getattr(user, 'telegram_id', None),
                    'developer': getattr(user, 'developer', False),
                    'is_validate': getattr(user, 'is_validate', False),
                    'bio': getattr(user, 'bio', ''),
                }
            })

        if 'username' in data:
            if User.objects.exclude(pk=user.pk).filter(username=data['username']).exists():
                return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
            user.username = data['username']
            user.save()

        if all(key in data for key in ['current_password', 'new_password']):
            if not user.check_password(data['current_password']):
                return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(data['new_password'])
            user.save()

        if 'telegram_id' in data:
            user.telegram_id = data.get('telegram_id')
            user.save()

        if 'bio' in data:
            user.bio = data.get('bio', '')
            user.save()

        if 'name' in data:
            name = str(data.get('name', '')).strip()
            parts = name.split()
            user.first_name = parts[0] if parts else ''
            user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
            user.save()

        if 'email' in data:
            email = str(data.get('email', '')).strip()
            if email:
                if User.objects.exclude(pk=user.pk).filter(email=email).exists():
                    return Response({'error': 'Email already in use by another account'}, status=status.HTTP_400_BAD_REQUEST)
                user.email = email
                user.save()

        return Response({
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'name': (user.get_full_name() or '').strip() or user.username,
                'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
            'is_staff': user.is_staff,
            'telegram_id': getattr(user, 'telegram_id', None),
            'developer': getattr(user, 'developer', False),
            'is_validate': getattr(user, 'is_validate', False),
            'bio': getattr(user, 'bio', ''),
        }
    })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@csrf_exempt
def me(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    
    from django.utils import timezone
    user.last_seen = timezone.now()
    user.save(update_fields=['last_seen'])
    
    full_name = (user.get_full_name() or '').strip() or user.username

    # Build Assigned Tasks for this user
    user_assigned = AssignedTask.objects.filter(user=user).order_by('-date', '-created_at')
    tasks_data = [
        {
            'id': t.id,
            'title': t.title or 'Assigned Task',
            'text': t.text,
            'done': t.done,
            'date': t.date.isoformat(),
            'assignedById': str(getattr(t.assigned_by, 'id', '')),
            'assignedBy': getattr(t.assigned_by, 'username', ''),
        }
        for t in user_assigned
    ]

    # Build All Submissions for this user
    user_submissions = Submission.objects.filter(user=user).order_by('-date')
    submissions_data = [
        {
            'id': s.id,
            'date': s.date.isoformat(),
            'report': s.report,
            'rating': s.rating,
            'status': s.status,
            'created_at': s.created_at.isoformat(),
            'updated_at': s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in user_submissions
    ]

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': full_name,
            'team_role': getattr(user, 'team_role', None),
            'profile_picture': request.build_absolute_uri(user.profile_picture.url) if getattr(user, 'profile_picture', None) else None,
            'telegram_id': getattr(user, 'telegram_id', None),
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'developer': getattr(user, 'developer', False),
            'is_validate': getattr(user, 'is_validate', False),
            'can_see_work_hours': getattr(user, 'can_see_work_hours', False),
            'bio': getattr(user, 'bio', ''),
            'notepad_content': getattr(user.profile, 'notepad_content', '') if hasattr(user, 'profile') else '',
            'all_tasks': tasks_data,
            'all_submissions': submissions_data,
        }
    })


@csrf_exempt
def team_list(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    
    from django.utils import timezone
    user.last_seen = timezone.now()
    user.save(update_fields=['last_seen'])

    users = User.objects.all().order_by('username')
    data = []
    for u in users:
        full_name = (u.get_full_name() or '').strip() or u.username
        data.append({
            'id': u.id,
            'name': full_name,
            'role': u.team_role,
            'type': u.team_role,
            'avatarUrl': request.build_absolute_uri(u.profile_picture.url) if u.profile_picture else None,
            'telegramId': getattr(u, 'telegram_id', None),
            'adminTasks': getattr(u, 'admin_task_list', []),
            'developer': getattr(u, 'developer', False),
            'is_validate': getattr(u, 'is_validate', False),
            'can_see_work_hours': getattr(u, 'can_see_work_hours', False),
            'bio': getattr(u, 'bio', ''),
            'last_seen': u.last_seen.isoformat() if u.last_seen else None,
            'is_online': u.is_online(),
        })
    return JsonResponse({'users': data})

@csrf_exempt
def update_user(request):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    caller = None
    if request.user.is_authenticated:
        caller = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                caller = token.user
            except Token.DoesNotExist:
                pass
    if not caller:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    try:
        body = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        body = {}

    try:
        target_id = body.get('userId')
        if not target_id:
            return JsonResponse({'error': 'userId required'}, status=400)
        target_user = User.objects.get(id=target_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Target user not found'}, status=404)

    is_admin = bool(getattr(caller, 'is_staff', False) or getattr(caller, 'is_superuser', False))
    if not is_admin and str(caller.id) != str(target_user.id):
        return JsonResponse({'error': 'Not authorized'}, status=403)

    if 'developer' in body:
        target_user.developer = bool(body['developer'])
        target_user.save()
    if 'is_validate' in body:
        if not is_admin:
            return JsonResponse({'error': 'Not authorized'}, status=403)
        target_user.is_validate = bool(body['is_validate'])
        target_user.save()
    if 'can_see_work_hours' in body:
        if not getattr(caller, 'developer', False):
             return JsonResponse({'error': 'Not authorized'}, status=403)
        target_user.can_see_work_hours = bool(body['can_see_work_hours'])
        target_user.save()
    
    if 'bio' in body:
        target_user.bio = body['bio']
        target_user.save()
        
    if 'team_role' in body:
        allowed = is_admin or getattr(caller, 'team_role', '') == 'Leader' or getattr(caller, 'developer', False)
        if not allowed:
            return JsonResponse({'error': 'Not authorized'}, status=403)
        role = str(body['team_role'])
        target_user.team_role = role
        target_user.save()

    full_name = (target_user.get_full_name() or '').strip() or target_user.username
    return JsonResponse({
        'user': {
            'id': target_user.id,
            'username': target_user.username,
            'email': target_user.email,
            'name': full_name,
            'team_role': getattr(target_user, 'team_role', None),
            'profile_picture': request.build_absolute_uri(target_user.profile_picture.url) if getattr(target_user, 'profile_picture', None) else None,
            'telegram_id': getattr(target_user, 'telegram_id', None),
            'is_staff': target_user.is_staff,
            'is_superuser': target_user.is_superuser,
            'developer': getattr(target_user, 'developer', False),
            'is_validate': getattr(target_user, 'is_validate', False),
            'can_see_work_hours': getattr(target_user, 'can_see_work_hours', False),
            'bio': getattr(target_user, 'bio', ''),
        }
    }, status=200)

@csrf_exempt
def admin_tasks_api(request):
    if request.method not in ['GET', 'POST']:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    caller = None
    if request.user.is_authenticated:
        caller = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                caller = token.user
            except Token.DoesNotExist:
                pass
    if not caller:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    def is_admin(u):
        try:
            return u.is_staff or u.is_superuser
        except Exception:
            return False

    User = get_user_model()

    q_user_id = request.GET.get('userId')
    target_user = caller
    if q_user_id and is_admin(caller):
        try:
            target_user = User.objects.get(id=q_user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'Target user not found'}, status=404)

    if request.method == 'GET':
        tasks = getattr(target_user, 'admin_task_list', []) or []
        return JsonResponse({'userId': str(target_user.id), 'tasks': tasks})

    try:
        body = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        body = {}

    body_user_id = str(body.get('userId') or '')
    if body_user_id:
        if not is_admin(caller) and body_user_id != str(caller.id):
            return JsonResponse({'error': 'Not authorized'}, status=403)
        try:
            target_user = User.objects.get(id=body_user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'Target user not found'}, status=404)

    raw_tasks = body.get('tasks') or []
    normalized = []
    for t in raw_tasks:
        text = str(t.get('text') or '').strip()
        done = bool(t.get('done'))
        if not text:
            continue
        normalized.append({'text': text, 'done': done})

    target_user.admin_task_list = normalized
    target_user.save()
    return JsonResponse({'userId': str(target_user.id), 'tasks': normalized}, status=201)

@api_view(['GET'])
@csrf_exempt
def get_telegram_data(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    # Allow any authenticated user to access their own Telegram data
    # Removed the developer check that was preventing regular users from accessing this endpoint
    # if not getattr(user, 'developer', False):
    #     return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    from tickets.models import Telegram
    telegram, _ = Telegram.objects.get_or_create(user=user)
    return Response({'telegram': {
        'is_active': telegram.is_active,
        'bot_name': telegram.bot_name or '',
        'api_token': telegram.api_token or '',
        'send_log': getattr(telegram, 'send_log', False),
        'send_report': getattr(telegram, 'send_report', False),
        'send_tasks': getattr(telegram, 'send_tasks', False),
        'send_task_notifications': getattr(telegram, 'send_task_notifications', True),
        'send_dollar_price': getattr(telegram, 'send_dollar_price', False),
        'send_gold_price': getattr(telegram, 'send_gold_price', False),
        'dollar_price_cmd': getattr(telegram, 'dollar_price_cmd', '/dollar'),
        'gold_price_cmd': getattr(telegram, 'gold_price_cmd', '/gold'),
        'sae_data_enabled': getattr(telegram, 'sae_data_enabled', False),
        'sae_automation_interval': getattr(telegram, 'sae_automation_interval', 5),
        'google_sheets_auto_sync_enabled': getattr(telegram, 'google_sheets_auto_sync_enabled', False),
        'google_sheets_sync_interval': getattr(telegram, 'google_sheets_sync_interval', 10),
        'bot_status': getattr(telegram, 'bot_status', 'idle'),
    }})

@api_view(['POST'])
@csrf_exempt
def update_telegram_data(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    if not getattr(user, 'developer', False):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    try:
        data = request.data
    except Exception:
        data = {}
    from tickets.models import Telegram
    telegram, _ = Telegram.objects.get_or_create(user=user)
    if 'is_active' in data:
        telegram.is_active = bool(data.get('is_active'))
    if 'bot_name' in data:
        telegram.bot_name = str(data.get('bot_name') or '')
    if 'api_token' in data:
        telegram.api_token = str(data.get('api_token') or '')
    if 'send_log' in data:
        telegram.send_log = bool(data.get('send_log'))
    if 'send_report' in data:
        telegram.send_report = bool(data.get('send_report'))
    if 'send_tasks' in data:
        telegram.send_tasks = bool(data.get('send_tasks'))
    if 'send_task_notifications' in data:
        telegram.send_task_notifications = bool(data.get('send_task_notifications'))
    if 'send_dollar_price' in data:
        telegram.send_dollar_price = bool(data.get('send_dollar_price'))
    if 'send_gold_price' in data:
        telegram.send_gold_price = bool(data.get('send_gold_price'))
    if 'dollar_price_cmd' in data:
        telegram.dollar_price_cmd = str(data.get('dollar_price_cmd') or '/dollar')
    if 'gold_price_cmd' in data:
        telegram.gold_price_cmd = str(data.get('gold_price_cmd') or '/gold')
    if 'sae_data_enabled' in data:
        telegram.sae_data_enabled = bool(data.get('sae_data_enabled'))
    if 'sae_automation_interval' in data:
        telegram.sae_automation_interval = int(data.get('sae_automation_interval') or 5)
    if 'google_sheets_auto_sync_enabled' in data:
        telegram.google_sheets_auto_sync_enabled = bool(data.get('google_sheets_auto_sync_enabled'))
    if 'google_sheets_sync_interval' in data:
        telegram.google_sheets_sync_interval = int(data.get('google_sheets_sync_interval') or 10)
    if 'bot_status' in data:
        telegram.bot_status = str(data.get('bot_status') or 'idle')
    telegram.save()
    return Response({'telegram': {
        'is_active': telegram.is_active,
        'bot_name': telegram.bot_name or '',
        'api_token': telegram.api_token or '',
        'send_log': getattr(telegram, 'send_log', False),
        'send_report': getattr(telegram, 'send_report', False),
        'send_tasks': getattr(telegram, 'send_tasks', False),
        'send_task_notifications': getattr(telegram, 'send_task_notifications', True),
        'send_dollar_price': getattr(telegram, 'send_dollar_price', False),
        'send_gold_price': getattr(telegram, 'send_gold_price', False),
        'dollar_price_cmd': getattr(telegram, 'dollar_price_cmd', '/dollar'),
        'gold_price_cmd': getattr(telegram, 'gold_price_cmd', '/gold'),
        'sae_data_enabled': getattr(telegram, 'sae_data_enabled', False),
        'sae_automation_interval': getattr(telegram, 'sae_automation_interval', 5),
        'google_sheets_auto_sync_enabled': getattr(telegram, 'google_sheets_auto_sync_enabled', False),
        'google_sheets_sync_interval': getattr(telegram, 'google_sheets_sync_interval', 10),
        'bot_status': getattr(telegram, 'bot_status', 'idle'),
    }})

@api_view(['POST'])
@csrf_exempt
def start_telegram(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    if not getattr(user, 'developer', False):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    try:
        data = request.data
    except Exception:
        data = {}
    from tickets.models import Telegram
    telegram, _ = Telegram.objects.get_or_create(user=user)
    if not telegram.api_token:
        return Response({'error': 'BotFather token required'}, status=status.HTTP_400_BAD_REQUEST)
    api_token = str(telegram.api_token or '').strip()
    if not api_token:
        return Response({'error': 'BotFather token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        _ = _telegram_request(api_token, 'getMe')
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return Response({'error': 'Invalid BotFather token'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': f'Telegram API error: {e.code}'}, status=status.HTTP_400_BAD_REQUEST)
    except urllib.error.URLError:
        return Response({'error': 'Network error contacting Telegram'}, status=status.HTTP_502_BAD_GATEWAY)
    chat_id = _resolve_chat_id(api_token, user)
    if chat_id is None:
        return Response({'error': 'Cannot resolve chat. Send /start to your bot and set Telegram ID (numeric or @username).'}, status=status.HTTP_400_BAD_REQUEST)
    telegram.is_active = False
    telegram.save()
    try:
        webhook_url = request.build_absolute_uri('/api/telegram/webhook/')
        try:
            _ = _telegram_request(api_token, 'setWebhook', {
                'url': webhook_url,
                'allowed_updates': ['callback_query', 'message'],
                'drop_pending_updates': False,
            })
        except Exception:
            pass
        _ = _telegram_request(api_token, 'sendMessage', {'chat_id': chat_id, 'text': 'hi'})
    except urllib.error.HTTPError as e:
        return Response({'error': f'Telegram API error: {e.code}'}, status=status.HTTP_400_BAD_REQUEST)
    except urllib.error.URLError:
        return Response({'error': 'Network error contacting Telegram'}, status=status.HTTP_502_BAD_GATEWAY)
    telegram.is_active = True
    print(f"Restarting Telegram bot for user {user.username} (ID: {user.id})")
    telegram.bot_status = 'start'
    print(f"Starting Telegram bot for user {user.username} (ID: {user.id})")
    telegram.save()
    
    # Try to start the bot process in a new terminal
    try:
        # Use our new management command to start the bot in a new terminal
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        subprocess.Popen([
            'python', 'manage.py', 'start_telegram_bot_in_terminal',
            '--user-id', str(user.id)
        ], cwd=project_dir)
    except Exception as e:
        print(f"Failed to start Telegram bot process in terminal: {e}")
    
    return Response({'telegram': {
        'is_active': telegram.is_active,
        'bot_name': telegram.bot_name or '',
        'api_token': telegram.api_token or '',
        'send_log': getattr(telegram, 'send_log', False),
        'send_report': getattr(telegram, 'send_report', False),
        'send_tasks': getattr(telegram, 'send_tasks', False),
        'send_task_notifications': getattr(telegram, 'send_task_notifications', True),
        'send_dollar_price': getattr(telegram, 'send_dollar_price', False),
        'send_gold_price': getattr(telegram, 'send_gold_price', False),
        'dollar_price_cmd': getattr(telegram, 'dollar_price_cmd', '/dollar'),
        'gold_price_cmd': getattr(telegram, 'gold_price_cmd', '/gold'),
        'bot_status': telegram.bot_status,
    }})

@api_view(['POST'])
@csrf_exempt
def pause_telegram(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    if not getattr(user, 'developer', False):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    from tickets.models import Telegram
    telegram, _ = Telegram.objects.get_or_create(user=user)
    telegram.is_active = False
    telegram.bot_status = 'pause'
    print(f"Pausing Telegram bot for user {user.username} (ID: {user.id})")
    telegram.save()
    return Response({'telegram': {
        'is_active': telegram.is_active,
        'bot_name': telegram.bot_name or '',
        'api_token': telegram.api_token or '',
        'send_log': getattr(telegram, 'send_log', False),
        'send_report': getattr(telegram, 'send_report', False),
        'send_tasks': getattr(telegram, 'send_tasks', False),
        'send_task_notifications': getattr(telegram, 'send_task_notifications', True),
        'send_dollar_price': getattr(telegram, 'send_dollar_price', False),
        'send_gold_price': getattr(telegram, 'send_gold_price', False),
        'dollar_price_cmd': getattr(telegram, 'dollar_price_cmd', '/dollar'),
        'gold_price_cmd': getattr(telegram, 'gold_price_cmd', '/gold'),
        'bot_status': telegram.bot_status,
    }})

@api_view(['POST'])
@csrf_exempt
def restart_telegram(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    if not getattr(user, 'developer', False):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    from tickets.models import Telegram
    telegram, _ = Telegram.objects.get_or_create(user=user)
    telegram.is_active = True
    print(f"Restarting Telegram bot for user {user.username} (ID: {user.id})")
    telegram.bot_status = 'start'
    print(f"Starting Telegram bot for user {user.username} (ID: {user.id})")
    telegram.save()
    
    # Try to start the bot process in a new terminal
    try:
        # Use our new management command to start the bot in a new terminal
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        subprocess.Popen([
            'python', 'manage.py', 'start_telegram_bot_in_terminal',
            '--user-id', str(user.id)
        ], cwd=project_dir)
    except Exception as e:
        print(f"Failed to start Telegram bot process in terminal: {e}")
    
    return Response({'telegram': {
        'is_active': telegram.is_active,
        'bot_name': telegram.bot_name or '',
        'api_token': telegram.api_token or '',
        'send_log': getattr(telegram, 'send_log', False),
        'send_report': getattr(telegram, 'send_report', False),
        'send_tasks': getattr(telegram, 'send_tasks', False),
        'send_task_notifications': getattr(telegram, 'send_task_notifications', True),
        'send_dollar_price': getattr(telegram, 'send_dollar_price', False),
        'send_gold_price': getattr(telegram, 'send_gold_price', False),
        'dollar_price_cmd': getattr(telegram, 'dollar_price_cmd', '/dollar'),
        'gold_price_cmd': getattr(telegram, 'gold_price_cmd', '/gold'),
        'bot_status': telegram.bot_status,
    }})

@api_view(['GET'])
@csrf_exempt
def list_telegram_bots(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    caller = None
    if request.user.is_authenticated:
        caller = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            caller = token.user
        except Token.DoesNotExist:
            pass
    if not caller:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    from tickets.models import Telegram
    
    # Allow regular users to see at least their own bot
    is_admin = bool(getattr(caller, 'is_staff', False) or getattr(caller, 'is_superuser', False))
    is_developer = getattr(caller, 'developer', False)
    
    if is_admin or is_developer:
        # Admins and developers can see all bots
        bots = Telegram.objects.select_related('user').all()
    else:
        # Regular users can only see their own bot
        bots = Telegram.objects.select_related('user').filter(user=caller)
    
    items = []
    for t in bots:
        item = {
            'id': t.id,
            'bot_name': t.bot_name or '',
            'is_active': t.is_active,
            'owner': getattr(t.user, 'username', ''),
            'owner_id': str(getattr(t.user, 'id', '')),
        }
        if str(getattr(t.user, 'id', '')) == str(getattr(caller, 'id', '')):
            item['api_token'] = t.api_token or ''
        items.append(item)
    return Response({'bots': items})

@api_view(['DELETE'])
@csrf_exempt
def delete_user(request, user_id):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    caller = None
    if request.user.is_authenticated:
        caller = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            caller = token.user
        except Token.DoesNotExist:
            pass
    if not caller:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    is_admin = bool(getattr(caller, 'is_staff', False) or getattr(caller, 'is_superuser', False))
    is_developer = getattr(caller, 'developer', False)
    
    if not (is_admin or is_developer):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user_to_delete = User.objects.get(id=user_id)
        # Prevent deleting yourself
        if str(user_to_delete.id) == str(caller.id):
             return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
             
        user_to_delete.delete()
        return Response({'message': 'User deleted successfully'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@csrf_exempt
def delete_telegram_bot(request, bot_id):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    caller = None
    if request.user.is_authenticated:
        caller = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            caller = token.user
        except Token.DoesNotExist:
            pass
    if not caller:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    is_admin = bool(getattr(caller, 'is_staff', False) or getattr(caller, 'is_superuser', False))
    if not (is_admin or getattr(caller, 'developer', False)):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    from tickets.models import Telegram
    try:
        bot = Telegram.objects.get(id=bot_id)
        
        if str(getattr(bot.user, 'id', '')) != str(getattr(caller, 'id', '')) and not is_admin:
             return Response({'error': 'Not authorized to delete this bot'}, status=status.HTTP_403_FORBIDDEN)
        
        bot.delete()
        return Response({'message': 'Bot deleted successfully'})
    except Telegram.DoesNotExist:
        return Response({'error': 'Bot not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@csrf_exempt
def export_database(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    caller = None
    if request.user.is_authenticated:
        caller = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            caller = token.user
        except Token.DoesNotExist:
            pass
    if not caller:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not getattr(caller, 'developer', False):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    from django.core.management import call_command
    from django.http import HttpResponse
    import io
    
    out = io.StringIO()
    call_command('dumpdata', stdout=out)
    data = out.getvalue()
    out.close()
    
    response = HttpResponse(data, content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename="database_dump.json"'
    return response

@api_view(['POST'])
@csrf_exempt
def import_database(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    caller = None
    if request.user.is_authenticated:
        caller = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            caller = token.user
        except Token.DoesNotExist:
            pass
    if not caller:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not getattr(caller, 'developer', False):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    uploaded_file = request.FILES['file']
    
    import tempfile
    import os
    from django.core.management import call_command
    
    try:
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as tmp:
            for chunk in uploaded_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
        
        
        call_command('loaddata', tmp_path)
        
        
        os.remove(tmp_path)
        
        return Response({'message': 'Database imported successfully'})
    except Exception as e:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        return Response({'error': f'Import failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
def unassigned_users(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    caller = None
    if request.user.is_authenticated:
        caller = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                caller = token.user
            except Token.DoesNotExist:
                pass
    if not caller:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    is_admin = bool(getattr(caller, 'is_staff', False) or getattr(caller, 'is_superuser', False))
    if not (is_admin or getattr(caller, 'team_role', '') == 'Leader'):
        return JsonResponse({'error': 'Not authorized'}, status=403)
    users = User.objects.filter(team_role='None').order_by('username')
    data = []
    for u in users:
        full_name = (u.get_full_name() or '').strip() or u.username
        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'name': full_name,
            'profile_picture': request.build_absolute_uri(u.profile_picture.url) if getattr(u, 'profile_picture', None) else None,
        })
    return JsonResponse({'users': data})
def _telegram_request(api_token: str, method: str, payload: dict | None = None, timeout: int = 10):
    url = f"https://api.telegram.org/bot{api_token}/{method}"
    data = None
    headers = {'Content-Type': 'application/json'}
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return {}

def _resolve_chat_id(api_token: str, user):
    raw_id = str(getattr(user, 'telegram_id', '') or '').strip()
    if not raw_id:
        return None
    try:
        return int(raw_id)
    except Exception:
        pass
    username = raw_id.lstrip('@').strip().lower()
    try:
        updates = _telegram_request(api_token, 'getUpdates') or {}
    except urllib.error.HTTPError:
        return None
    except urllib.error.URLError:
        return None
    results = updates.get('result') or []
    for upd in results:
        msg = upd.get('message') or {}
        frm = msg.get('from') or {}
        chat = msg.get('chat') or {}
        frm_username = str(frm.get('username') or '').strip().lower()
        if frm_username and frm_username == username:
            cid = chat.get('id')
            try:
                return int(cid)
            except Exception:
                continue
    return None

@csrf_exempt
def telegram_webhook(request):
    try:
        body = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        body = {}
    cq = body.get('callback_query') or None
    message = body.get('message') or {}
    if not cq and not message:
        return JsonResponse({'ok': True})
    
    data = ''
    if cq:
        data = str(cq.get('data') or '')
        message = cq.get('message') or {}
        callback_id = cq.get('id')
    else:
        callback_id = None

    chat = message.get('chat') or {}
    chat_id = chat.get('id')
    text = str(message.get('text') or '').strip()
    parts = data.split(':')
    report_id = None
    action = None
    rating_val = None
    owner_id = None
    for i, p in enumerate(parts):
        if p == 'report' and i + 1 < len(parts):
            try:
                report_id = int(parts[i + 1])
            except Exception:
                report_id = None
        if p in ('approve', 'decline', 'detail', 'rate'):
            action = p
            if p == 'rate' and i + 1 < len(parts):
                try:
                    rating_val = int(parts[i + 1])
                except Exception:
                    rating_val = None
        if p == 'owner' and i + 1 < len(parts):
            try:
                owner_id = int(parts[i + 1])
            except Exception:
                owner_id = None
    from tickets.models import Report, Submission, Telegram
    rec = None
    if owner_id is not None:
        rec = Telegram.objects.filter(user_id=owner_id).first()
    if not rec:
        rec = Telegram.objects.exclude(api_token__isnull=True).exclude(api_token='').first()
    api_token = (rec.api_token or '').strip() if rec else ''
    if api_token and callback_id:
        try:
            _telegram_request(api_token, 'answerCallbackQuery', {'callback_query_id': callback_id})
        except Exception:
            pass
    if not api_token or not chat_id:
        return JsonResponse({'ok': False})

    
    if text:
        from tickets.views import get_dollar_price, get_gold_price
        
        dollar_cmd = (rec.dollar_price_cmd or '/dollar').strip()
        gold_cmd = (rec.gold_price_cmd or '/gold').strip()
        
        
        if rec.send_dollar_price and text == dollar_cmd:
            price = get_dollar_price()
            _telegram_request(api_token, 'sendMessage', {'chat_id': chat_id, 'text': f"Dollar Price: {price}"})
            return JsonResponse({'ok': True})
            
        
        if rec.send_gold_price and text == gold_cmd:
            price = get_gold_price()
            _telegram_request(api_token, 'sendMessage', {'chat_id': chat_id, 'text': f"Gold Price: {price}"})
            return JsonResponse({'ok': True})

    
    if not report_id or not action:
        return JsonResponse({'ok': False})
    if action == 'approve':
        kb = [[
            {'text': '1', 'callback_data': f'report:{report_id}:rate:1:owner:{owner_id or 0}'},
            {'text': '2', 'callback_data': f'report:{report_id}:rate:2:owner:{owner_id or 0}'},
            {'text': '3', 'callback_data': f'report:{report_id}:rate:3:owner:{owner_id or 0}'},
            {'text': '4', 'callback_data': f'report:{report_id}:rate:4:owner:{owner_id or 0}'},
            {'text': '5', 'callback_data': f'report:{report_id}:rate:5:owner:{owner_id or 0}'},
        ]]
        _telegram_request(api_token, 'sendMessage', {
            'chat_id': chat_id,
            'text': 'Select rating (1-5):',
            'reply_markup': {'inline_keyboard': kb}
        })
        return JsonResponse({'ok': True})
    if action == 'decline':
        try:
            r = Report.objects.get(id=report_id)
            r.status = 'declined'
            r.rating = None
            r.save()
            try:
                Submission.objects.filter(user=r.user, date=r.submitted_at.date()).update(rating=None)
            except Exception:
                pass
            _telegram_request(api_token, 'sendMessage', {
                'chat_id': chat_id,
                'text': f'Report {report_id} declined'
            })
        except Report.DoesNotExist:
            pass
        return JsonResponse({'ok': True})
    if action == 'detail':
        try:
            r = Report.objects.select_related('user').get(id=report_id)
            try:
                tasks = json.loads(r.tasks or '[]')
            except Exception:
                tasks = []
            lines = []
            for t in tasks:
                title = str(t.get('title') or t.get('text') or '').strip()
                done = bool(t.get('done'))
                if title:
                    lines.append(f"- {'[x]' if done else '[ ]'} {title}")
            name = (getattr(r.user, 'get_full_name', lambda: '')() or '').strip() or getattr(r.user, 'username', '')
            rating_text = r.rating if r.rating is not None else '-'
            note_text = r.note or ''
            detail = (
                f"Report by {name}\nStatus: {r.status}\nRating: {rating_text}\n\n{note_text}\n\n" + "\n".join(lines[:20])
            ).strip()
            _telegram_request(api_token, 'sendMessage', {
                'chat_id': chat_id,
                'text': detail
            })
        except Report.DoesNotExist:
            pass
        return JsonResponse({'ok': True})
    if action == 'rate' and rating_val is not None:
        try:
            r = Report.objects.select_related('user').get(id=report_id)
            r.status = 'approved'
            r.rating = int(rating_val)
            r.save()
            try:
                Submission.objects.filter(user=r.user, date=r.submitted_at.date()).update(rating=r.rating)
            except Exception:
                pass
            _telegram_request(api_token, 'sendMessage', {
                'chat_id': chat_id,
                'text': f'Report {report_id} approved with rating {rating_val}'
            })
        except Report.DoesNotExist:
            pass
        return JsonResponse({'ok': True})
    return JsonResponse({'ok': False})

@api_view(['POST'])
@csrf_exempt
def check_in(request):
    """Check in to work (morning or afternoon shift)"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    shift = request.data.get('shift', 'morning')
    today = date.today()
    
    working_hours, created = WorkingHours.objects.get_or_create(
        user=user,
        date=today,
        defaults={'is_currently_working': False}
    )
    
    now = timezone.now()
    
    if shift == 'morning':
        if working_hours.morning_check_in:
            return Response({'error': 'Already checked in for morning shift'}, status=status.HTTP_400_BAD_REQUEST)
        working_hours.morning_check_in = now
        working_hours.is_currently_working = True
        working_hours.current_shift = 'morning'
    elif shift == 'afternoon':
        if working_hours.afternoon_check_in:
            return Response({'error': 'Already checked in for afternoon shift'}, status=status.HTTP_400_BAD_REQUEST)
        working_hours.afternoon_check_in = now
        working_hours.is_currently_working = True
        working_hours.current_shift = 'afternoon'
    else:
        return Response({'error': 'Invalid shift'}, status=status.HTTP_400_BAD_REQUEST)
    
    working_hours.save()
    
    return Response({
        'message': f'Checked in for {shift} shift',
        'working_hours': {
            'id': working_hours.id,
            'date': working_hours.date,
            'morning_check_in': working_hours.morning_check_in,
            'morning_check_out': working_hours.morning_check_out,
            'afternoon_check_in': working_hours.afternoon_check_in,
            'afternoon_check_out': working_hours.afternoon_check_out,
            'is_currently_working': working_hours.is_currently_working,
            'current_shift': working_hours.current_shift,
        }
    })

@api_view(['POST'])
@csrf_exempt
def check_out(request):
    """Check out from work (morning or afternoon shift)"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    shift = request.data.get('shift', 'morning')
    today = date.today()
    
    try:
        working_hours = WorkingHours.objects.get(user=user, date=today)
    except WorkingHours.DoesNotExist:
        return Response({'error': 'No check-in record found for today'}, status=status.HTTP_404_NOT_FOUND)
    
    now = timezone.now()
    
    if shift == 'morning':
        if not working_hours.morning_check_in:
            return Response({'error': 'Not checked in for morning shift'}, status=status.HTTP_400_BAD_REQUEST)
        if working_hours.morning_check_out:
            return Response({'error': 'Already checked out from morning shift'}, status=status.HTTP_400_BAD_REQUEST)
        working_hours.morning_check_out = now
    elif shift == 'afternoon':
        if not working_hours.afternoon_check_in:
            return Response({'error': 'Not checked in for afternoon shift'}, status=status.HTTP_400_BAD_REQUEST)
        if working_hours.afternoon_check_out:
            return Response({'error': 'Already checked out from afternoon shift'}, status=status.HTTP_400_BAD_REQUEST)
        working_hours.afternoon_check_out = now
    else:
        return Response({'error': 'Invalid shift'}, status=status.HTTP_400_BAD_REQUEST)
    
    if shift == working_hours.current_shift:
        working_hours.is_currently_working = False
        working_hours.current_shift = None
    
    working_hours.save()
    
    return Response({
        'message': f'Checked out from {shift} shift',
        'working_hours': {
            'id': working_hours.id,
            'date': working_hours.date,
            'morning_check_in': working_hours.morning_check_in,
            'morning_check_out': working_hours.morning_check_out,
            'afternoon_check_in': working_hours.afternoon_check_in,
            'afternoon_check_out': working_hours.afternoon_check_out,
            'is_currently_working': working_hours.is_currently_working,
            'current_shift': working_hours.current_shift,
        }
    })

@api_view(['GET'])
@csrf_exempt
def get_working_hours(request):
    """Get working hours for current user or all users"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    user = None
    if request.user.is_authenticated:
        user = request.user
    elif auth_header.startswith('Token '):
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    today = date.today()
    
    try:
        my_hours = WorkingHours.objects.get(user=user, date=today)
        my_working_hours = {
            'id': my_hours.id,
            'date': my_hours.date,
            'morning_check_in': my_hours.morning_check_in,
            'morning_check_out': my_hours.morning_check_out,
            'afternoon_check_in': my_hours.afternoon_check_in,
            'afternoon_check_out': my_hours.afternoon_check_out,
            'is_currently_working': my_hours.is_currently_working,
            'current_shift': my_hours.current_shift,
        }
    except WorkingHours.DoesNotExist:
        my_working_hours = None
    
    all_users_hours = WorkingHours.objects.filter(date=today).select_related('user')
    
    users_at_work = []
    users_not_at_work = []
    
    all_users = User.objects.filter(is_active=True)
    checked_in_user_ids = set()
    
    for wh in all_users_hours:
        user_data = {
            'id': wh.user.id,
            'username': wh.user.username,
            'name': (wh.user.get_full_name() or '').strip() or wh.user.username,
            'profile_picture': wh.user.profile_picture.url if wh.user.profile_picture else None,
            'is_currently_working': wh.is_currently_working,
            'current_shift': wh.current_shift,
            'morning_check_in': wh.morning_check_in.isoformat() if wh.morning_check_in else None,
            'morning_check_out': wh.morning_check_out.isoformat() if wh.morning_check_out else None,
            'afternoon_check_in': wh.afternoon_check_in.isoformat() if wh.afternoon_check_in else None,
            'afternoon_check_out': wh.afternoon_check_out.isoformat() if wh.afternoon_check_out else None,
        }
        checked_in_user_ids.add(wh.user.id)
        if wh.is_currently_working:
            users_at_work.append(user_data)
        else:
            users_not_at_work.append(user_data)
    
    for u in all_users:
        if u.id not in checked_in_user_ids:
            users_not_at_work.append({
                'id': u.id,
                'username': u.username,
                'name': (u.get_full_name() or '').strip() or u.username,
                'profile_picture': u.profile_picture.url if u.profile_picture else None,
                'is_currently_working': False,
                'current_shift': None,
            })
    
    return Response({
        'my_working_hours': my_working_hours,
        'users_at_work': users_at_work,
        'users_not_at_work': users_not_at_work,
    })

class WorkingHoursViewSet(viewsets.ModelViewSet):
    queryset = WorkingHours.objects.all()
    serializer_class = WorkingHoursSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        date_param = self.request.query_params.get('date')
        
        # Developers/Admins can see everything for a date
        # Regular users can only see their own
        if getattr(user, 'developer', False) or user.is_staff:
            qs = WorkingHours.objects.all()
        else:
            qs = WorkingHours.objects.filter(user=user)
            
        if date_param:
            qs = qs.filter(date=date_param)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        if not getattr(request.user, 'developer', False):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data
        date_str = data.get('date')
        updates = data.get('updates', [])
        
        if not date_str or not updates:
            return Response({"error": "date and updates required"}, status=400)
            
        results = []
        for update in updates:
            user_id = update.get('user')
            if not user_id: continue
            
            wh, created = WorkingHours.objects.get_or_create(
                user_id=user_id,
                date=date_str
            )
            
            if 'morning_status' in update:
                wh.morning_status = update['morning_status']
            if 'morning_partial_time' in update:
                wh.morning_partial_time = update['morning_partial_time'] or None
            if 'afternoon_status' in update:
                wh.afternoon_status = update['afternoon_status']
            if 'afternoon_partial_time' in update:
                wh.afternoon_partial_time = update['afternoon_partial_time'] or None
            
            wh.save()
            results.append(wh)
            
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
