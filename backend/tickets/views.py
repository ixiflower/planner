from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from django.db.models import Q
from django.db import transaction # Import transaction
from django.utils.text import slugify
import json
import os
from datetime import datetime, timedelta, time
import urllib.request
import urllib.error
import urllib.request
import urllib.error
from .models import (
    Ticket,
    ConfigFile,
    V2RayConfig,
    UserProfile,
    PermanentNote,
    Token,
    ChecklistItem,
    DailyGoal,
    EventTemplate,
    Exercise,
    AssignedTask,
    EmployeeTodo,
    Report,
    ReportImage,
    Submission,
    Telegram,
    ChatRoom, # Import new models
    ChatMessage, # Import new models
    Notification, # Import new models
    StructureBoard, # Import new models
    Group, # Import Group model
    GroupMembership, # Import GroupMembership model
)
from .services import create_notification

import logging

logger = logging.getLogger(__name__) # Initialize logger

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

def get_dollar_price():
    
    return "60,000 Tomans"

def get_gold_price():
    
    return "4,500,000 Tomans"

User = get_user_model()


def _user_in_room(user, chat_room: ChatRoom) -> bool:
    if getattr(chat_room, 'is_group', False):
        return chat_room.members.filter(id=user.id).exists()
    return (chat_room.user1_id == user.id) or (chat_room.user2_id == user.id)


def _serialize_message(msg: ChatMessage):
    return {
        "id": msg.id,
        "user": {
            "id": msg.sender.id,
            "username": msg.sender.username,
            "name": (msg.sender.get_full_name() or "").strip() or msg.sender.username,
            "profile_picture": getattr(msg.sender, "profile_picture_url", None),
        },
        "message": msg.message,
        "image": msg.image.url if msg.image else None,
        "timestamp": msg.timestamp.isoformat(),
        "isNew": False,  # Default to false, frontend can set this when adding new messages
    }


def _get_or_create_general_room() -> ChatRoom:
    slug = "general"
    # Be robust against existing rooms with the same slug but wrong flags
    room, created = ChatRoom.objects.get_or_create(
        slug=slug,
        defaults={"is_group": True, "name": "#general"},
    )
    # Ensure it's marked as group
    if not room.is_group:
        room.is_group = True
        try:
            room.save(update_fields=["is_group"])  # minimal write
        except Exception:
            room.save()
    # Ensure members exist at least once (idempotent add)
    try:
        if room.members.through.objects.filter(chatroom_id=room.id).count() == 0:
            room.members.add(*User.objects.all())
    except Exception:
        # Fallback if through model access fails for any reason
        room.members.add(*User.objects.all())
    return room



def get_user_from_token(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    # Accept both "Token <key>" and raw token key
    if auth_header.startswith("Token "):
        token_key = auth_header.split(" ", 1)[1]
    else:
        token_key = auth_header.strip()
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return None


@csrf_exempt
def api_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body or "{}")
        identifier = (data.get("username") or data.get("email") or "").strip()
        password = (data.get("password") or "").strip()

        if not identifier or not password:
            return JsonResponse(
                {"error": "Username or email and password are required"}, status=400
            )

        user = None
        if "@" in identifier:
            try:
                user = User.objects.get(email=identifier)
            except User.DoesNotExist:
                user = None
            if user and not user.check_password(password):
                user = None
        else:
            user = authenticate(request, username=identifier, password=password)

        if user is not None:
            login(request, user)

            token, created = Token.objects.get_or_create(user=user)
            
            
            try:
                active_bots = Telegram.objects.filter(is_active=True)
                for bot in active_bots:
                    if not bot.api_token:
                        continue
                        
                    
                    if bot.send_log:
                        msg = f"User {user.username} logged in. Anything ok?"
                        try:
                            
                            
                            
                            
                            
                            chat_id = None
                            if bot.user.telegram_id:
                                chat_id = bot.user.telegram_id
                            
                            if chat_id:
                                _telegram_request(bot.api_token, 'sendMessage', {'chat_id': chat_id, 'text': msg})
                        except Exception as e:
                            print(f"Failed to send log to bot {bot.bot_name}: {e}")

                    
                    if bot.send_dollar_price:
                        price = get_dollar_price()
                        msg = f"Dollar Price: {price}"
                        try:
                            chat_id = bot.user.telegram_id
                            if chat_id:
                                _telegram_request(bot.api_token, 'sendMessage', {'chat_id': chat_id, 'text': msg})
                        except Exception as e:
                            print(f"Failed to send dollar price to bot {bot.bot_name}: {e}")

                    
                    if bot.send_gold_price:
                        price = get_gold_price()
                        msg = f"Gold Price: {price}"
                        try:
                            chat_id = bot.user.telegram_id
                            if chat_id:
                                _telegram_request(bot.api_token, 'sendMessage', {'chat_id': chat_id, 'text': msg})
                        except Exception as e:
                            print(f"Failed to send gold price to bot {bot.bot_name}: {e}")

            except Exception as e:
                print(f"Error in Telegram notifications: {e}")

            return JsonResponse(
                {
                    "success": True,
                    "token": token.key,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "name": (user.get_full_name() or "").strip() or user.username,
                        "is_staff": user.is_staff,
                        "is_superuser": user.is_superuser,
                        "developer": getattr(user, "developer", False),
                        "is_validate": getattr(user, "is_validate", False),
                    },
                }
            )
        else:
            return JsonResponse({"error": "Invalid credentials"}, status=401)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def api_logout(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:

        auth_header = request.headers.get("Authorization")
        if auth_header:
            token_key = auth_header
            try:
                token = Token.objects.get(key=token_key)
                token.delete()
                return JsonResponse(
                    {"success": True, "message": "Logged out successfully"}
                )
            except Token.DoesNotExist:
                return JsonResponse({"error": "Invalid token"}, status=401)
        else:
            return JsonResponse({"error": "Authorization header missing"}, status=401)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def home(request):

    return render(request, "tickets/home.html")


@login_required
def dashboard_view(request):
    return render(request, "tickets/dashboard.html")


@login_required
def admin_dashboard(request):
    return render(request, "tickets/admin_dashboard.html")


@csrf_exempt
def api_register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        data = {}

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    password2 = (data.get("password2") or "").strip()
    email = (data.get("email") or "").strip()
    name = (data.get("name") or "").strip()

    if not username or not password or not email:
        return JsonResponse(
            {"error": "Username, password, and email are required"}, status=400
        )

    if password2 and password2 != password:
        return JsonResponse({"error": "Passwords do not match"}, status=400)

    try:
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already exists"}, status=400)

        if email and User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already exists"}, status=400)

        user = User.objects.create_user(
            username=username, email=email, password=password
        )

        if name:
            parts = name.split()
            user.first_name = parts[0] if parts else ""
            user.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
            user.save()

        token, _ = Token.objects.get_or_create(user=user)

        return JsonResponse(
            {
                "success": True,
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                    "developer": getattr(user, "developer", False),
                    "is_validate": getattr(user, "is_validate", False),
                },
            },
            status=201,
        )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def api_update_profile(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            profile = user.profile

            if "is_v2ray_admin" in data:
                profile.is_v2ray_admin = data["is_v2ray_admin"]
            if "has_v2ray_access" in data:
                profile.has_v2ray_access = data["has_v2ray_access"]
            if "daily_events_json" in data:
                profile.daily_events_json = data["daily_events_json"]
            if "notepad_content" in data:
                profile.notepad_content = data["notepad_content"]

            profile.save()

            return JsonResponse(
                {
                    "success": True,
                    "profile": {
                        "is_v2ray_admin": profile.is_v2ray_admin,
                        "has_v2ray_access": profile.has_v2ray_access,
                        "daily_events_json": profile.daily_events_json,
                        "notepad_content": profile.notepad_content,
                    },
                }
            )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@login_required
def upload_file_view(request):
    return render(request, "tickets/upload.html")


@csrf_exempt
@csrf_exempt
def api_upload_file(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "POST":
        try:
            if "file" not in request.FILES:
                return JsonResponse({"error": "No file provided"}, status=400)

            file = request.FILES["file"]
            recipient_id = request.POST.get("recipient_id")
            
            is_public = False
            recipient = None
            target_role = None
            
            if recipient_id == "all":
                is_public = True
            elif recipient_id and recipient_id.startswith("role:"):
                target_role = recipient_id.split(":", 1)[1]
            elif recipient_id:
                try:
                    recipient = User.objects.get(id=recipient_id)
                except User.DoesNotExist:
                    pass

            config_file = ConfigFile.objects.create(
                name=file.name, 
                file=file, 
                uploaded_by=user,
                recipient=recipient,
                is_public=is_public,
                target_role=target_role
            )

            return JsonResponse(
                {
                    "success": True,
                    "file": {
                        "id": config_file.id,
                        "name": config_file.name,
                        "url": config_file.file.url,
                        "is_public": config_file.is_public,
                        "recipient_id": config_file.recipient.id if config_file.recipient else None,
                        "target_role": config_file.target_role,
                    },
                }
            )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@login_required
def file_upload_page(request):
    return render(request, "tickets/file_upload.html")


@csrf_exempt
def api_list_files(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        try:
            user_role = getattr(user, "team_role", "")
            
            
            files = ConfigFile.objects.filter(
                Q(uploaded_by=user) | 
                Q(recipient=user) | 
                Q(is_public=True) |
                Q(target_role=user_role)
            ).select_related('uploaded_by', 'recipient').distinct()
            
            files_data = []
            for f in files:
                uploaded_by_name = (f.uploaded_by.get_full_name() or "").strip() or f.uploaded_by.username
                recipient_name = ""
                if f.recipient:
                    recipient_name = (f.recipient.get_full_name() or "").strip() or f.recipient.username
                elif f.is_public:
                    recipient_name = "Everyone"
                elif f.target_role:
                    recipient_name = f"All {f.target_role}s"
                
                files_data.append({
                    "id": f.id, 
                    "name": f.name, 
                    "url": f.file.url,
                    "uploaded_by": uploaded_by_name,
                    "uploaded_by_id": f.uploaded_by.id,
                    "recipient": recipient_name,
                    "is_public": f.is_public,
                    "target_role": f.target_role,
                    "uploaded_at": f.uploaded_at.isoformat()
                })
                
            return JsonResponse({"files": files_data})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@require_http_methods(["DELETE"])
def api_delete_file(request, file_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        if user.developer:
            config_file = ConfigFile.objects.get(id=file_id)
        else:
            config_file = ConfigFile.objects.get(id=file_id, uploaded_by=user)
            
        config_file.delete()
        return JsonResponse({"success": True, "message": "File deleted successfully"})
    except ConfigFile.DoesNotExist:
        return JsonResponse(
            {"error": "File not found or you do not have permission to delete it"},
            status=404,
        )
    except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


@login_required
def download_file(request, file_id):
    try:
        config_file = ConfigFile.objects.get(id=file_id, uploaded_by=request.user)
        response = HttpResponse(
            config_file.file, content_type="application/octet-stream"
        )
        response["Content-Disposition"] = f'attachment; filename="{config_file.name}"'
        return response
    except ConfigFile.DoesNotExist:
        raise Http404("File not found")


@csrf_exempt
def api_config_list(request):
    user = get_user_from_token(request)
    if not user or not user.profile.is_v2ray_admin:
        return JsonResponse({"error": "Permission denied"}, status=403)

    if request.method == "GET":
        configs = V2RayConfig.objects.all()
        configs_data = [{"id": c.id, "name": c.name} for c in configs]
        return JsonResponse({"configs": configs_data})
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_config_detail(request, config_id):
    user = get_user_from_token(request)
    if not user or not user.profile.is_v2ray_admin:
        return JsonResponse({"error": "Permission denied"}, status=403)

    try:
        config = V2RayConfig.objects.get(id=config_id)
    except V2RayConfig.DoesNotExist:
        return JsonResponse({"error": "Config not found"}, status=404)

    if request.method == "GET":
        config_data = {
            "id": config.id,
            "name": config.name,
            "config_data": config.config_data,
        }
        return JsonResponse(config_data)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            config.name = data.get("name", config.name)
            config.config_data = data.get("config_data", config.config_data)
            config.save()
            return JsonResponse(
                {"success": True, "message": "Config updated successfully"}
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        config.delete()
        return JsonResponse({"success": True, "message": "Config deleted successfully"})

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_check_admin_status(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        is_admin = user.profile.is_v2ray_admin
        return JsonResponse({"is_admin": is_admin})
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_update_admin_status(request):
    user = get_user_from_token(request)
    if not user or not user.is_superuser:
        return JsonResponse({"error": "Permission denied"}, status=403)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            is_admin = data.get("is_admin")

            if user_id is None or is_admin is None:
                return JsonResponse(
                    {"error": "user_id and is_admin are required"}, status=400
                )

            target_user = User.objects.get(id=user_id)
            target_user.profile.is_v2ray_admin = is_admin
            target_user.profile.save()

            return JsonResponse(
                {"success": True, "message": "Admin status updated successfully"}
            )

        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_get_users(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        users = User.objects.all()
        users_data = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "is_staff": u.is_staff,
            }
            for u in users
        ]
        return JsonResponse({"users": users_data})
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_permanent_note_detail(request, note_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        note = PermanentNote.objects.get(id=note_id, user=user)
    except PermanentNote.DoesNotExist:
        return JsonResponse({"error": "Note not found"}, status=404)

    if request.method == "GET":
        note_data = {"id": note.id, "content": note.content}
        return JsonResponse(note_data)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            note.content = data.get("content", note.content)
            note.save()
            return JsonResponse(
                {"success": True, "message": "Note updated successfully"}
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        note.delete()
        return JsonResponse({"success": True, "message": "Note deleted successfully"})

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def task_api(request):
    return JsonResponse({"error": "Task API has been removed. Use Assigned Tasks APIs instead."}, status=410)


@csrf_exempt
def task_detail_api(request, task_id):
    return JsonResponse({"error": "Task API has been removed. Use Assigned Tasks APIs instead."}, status=410)

@csrf_exempt
def tasks_all_api(request):
    return JsonResponse({"error": "Tasks API has been removed. Use Assigned Tasks APIs instead."}, status=410)

@csrf_exempt
def user_daily_events_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        try:
            daily_events = json.loads(user.profile.daily_events_json or "[]")
            return JsonResponse({"daily_events": daily_events})
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format in profile"}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def checklist_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        checklist_items = ChecklistItem.objects.filter(user=user)
        items_data = [
            {"id": item.id, "text": item.text, "completed": item.completed}
            for item in checklist_items
        ]
        return JsonResponse({"checklist_items": items_data})

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            text = data.get("text")
            if not text:
                return JsonResponse({"error": "Text is required"}, status=400)

            item = ChecklistItem.objects.create(user=user, text=text)
            return JsonResponse(
                {"id": item.id, "text": item.text, "completed": item.completed},
                status=201,
            )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def checklist_item_api(request, item_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        item = ChecklistItem.objects.get(id=item_id, user=user)
    except ChecklistItem.DoesNotExist:
        return JsonResponse({"error": "Checklist item not found"}, status=404)

    if request.method == "GET":
        item_data = {"id": item.id, "text": item.text, "completed": item.completed}
        return JsonResponse(item_data)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            item.text = data.get("text", item.text)
            item.completed = data.get("completed", item.completed)
            item.save()
            return JsonResponse(
                {"success": True, "message": "Checklist item updated successfully"}
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        item.delete()
        return JsonResponse(
            {"success": True, "message": "Checklist item deleted successfully"}
        )

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def daily_goal_detail_api(request, goal_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        goal = DailyGoal.objects.get(id=goal_id, user=user)
    except DailyGoal.DoesNotExist:
        return JsonResponse({"error": "Daily goal not found"}, status=404)

    if request.method == "GET":
        goal_data = {"id": goal.id, "content": goal.content, "date": goal.date}
        return JsonResponse(goal_data)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            goal.content = data.get("content", goal.content)
            goal.save()
            return JsonResponse(
                {"success": True, "message": "Daily goal updated successfully"}
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        goal.delete()
        return JsonResponse(
            {"success": True, "message": "Daily goal deleted successfully"}
        )

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def event_template_detail_api(request, template_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        template = EventTemplate.objects.get(id=template_id, user=user)
    except EventTemplate.DoesNotExist:
        return JsonResponse({"error": "Event template not found"}, status=404)

    if request.method == "GET":
        template_data = {
            "id": template.id,
            "name": template.name,
            "template": template.template,
        }
        return JsonResponse(template_data)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            template.name = data.get("name", template.name)
            template.template = data.get("template", template.template)
            template.save()
            return JsonResponse(
                {"success": True, "message": "Event template updated successfully"}
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        template.delete()
        return JsonResponse(
            {"success": True, "message": "Event template deleted successfully"}
        )

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@login_required
def manage_tickets(request):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("home")

    tickets = Ticket.objects.all()
    return render(request, "tickets/manage_tickets.html", {"tickets": tickets})


@login_required
def create_ticket(request):
    if request.method == "POST":
        subject = request.POST.get("subject")
        description = request.POST.get("description")
        if subject and description:
            Ticket.objects.create(
                user=request.user, subject=subject, description=description
            )
            messages.success(request, "Ticket created successfully.")
            return redirect("manage_tickets")
        else:
            messages.error(request, "Subject and description are required.")
    return render(request, "tickets/create_ticket.html")


@login_required
def view_ticket(request, ticket_id):
    try:
        ticket = Ticket.objects.get(id=ticket_id)

        return render(request, "tickets/view_ticket.html", {"ticket": ticket})
    except Ticket.DoesNotExist:
        messages.error(request, "Ticket not found.")
        return redirect("manage_tickets")


def get_user_from_token(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    # Accept both "Token <key>" and raw token key
    if auth_header.startswith("Token "):
        token_key = auth_header.split(" ", 1)[1]
    else:
        token_key = auth_header.strip()
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return None


@csrf_exempt
def api_permanent_notes(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        notes = PermanentNote.objects.filter(user=user).order_by("-updated_at")
        notes_data = [{"id": note.id, "content": note.content} for note in notes]
        return JsonResponse({"notes": notes_data})

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            content = data.get("content", "")

            note, created = PermanentNote.objects.get_or_create(
                user=user, defaults={"content": content}
            )

            if not created:
                note.content = content
                note.save()

            return JsonResponse(
                {"id": note.id, "content": note.content}, status=201 if created else 200
            )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def submission_detail_api(request, submission_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        s = Submission.objects.select_related("user").get(id=submission_id)
    except Submission.DoesNotExist:
        return JsonResponse({"error": "Submission not found"}, status=404)

    is_owner = str(s.user.id) == str(user.id)
    is_admin = (
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "team_role", "") == "Leader"
    )

    if request.method == "GET":
        return JsonResponse(
            {
                "id": s.id,
                "userId": str(s.user.id),
                "username": getattr(s.user, "username", ""),
                "date": s.date.isoformat(),
                "report": s.report,
                "rating": s.rating,
                "status": s.status,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
        )

    elif request.method in ["PUT", "PATCH"]:
        if not is_admin:
            return JsonResponse({"error": "Not authorized"}, status=403)
        try:
            data = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        rating_val = data.get("rating", s.rating)
        status_val = data.get("status", s.status)
        
        
        s.rating = rating_val if rating_val in [1, 2, 3, 4, 5, None] else None
        if status_val in ["pending", "approved", "declined"]:
            s.status = status_val
        s.save()

        
        r = Report.objects.filter(user=s.user, submitted_at__date=s.date).first()
        if r:
            r.rating = s.rating
            if r.status != "approved" and s.rating is not None:
                r.status = "approved"
            r.status = s.status  
            r.save()

        return JsonResponse({"success": True})

    elif request.method == "DELETE":
        # Allow owner, admins, leaders, or developers to delete
        is_developer = getattr(user, "developer", False)
        if not (is_owner or is_admin or is_developer):
            return JsonResponse({"error": "Not authorized"}, status=403)
        Submission.objects.filter(id=submission_id).delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def daily_goals_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        date_str = request.GET.get("date")
        if not date_str:
            return JsonResponse({"error": "Date parameter is required"}, status=400)

        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
            daily_goal = DailyGoal.objects.filter(user=user, date=date).first()
            if daily_goal:
                goals_data = {
                    "id": daily_goal.id,
                    "content": daily_goal.content,
                    "date": daily_goal.date.isoformat(),
                }
                return JsonResponse({"daily_goal": None})
        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            date_str = data.get("date")
            content = data.get("content", "")

            if not date_str:
                return JsonResponse({"error": "Date is required"}, status=400)

            date = datetime.strptime(date_str, "%Y-%m-%d").date()

            daily_goal, created = DailyGoal.objects.update_or_create(
                user=user, date=date, defaults={"content": content}
            )

            goals_data = {
                "id": daily_goal.id,
                "content": daily_goal.content,
                "date": daily_goal.date.isoformat(),
            }

            return JsonResponse(goals_data, status=201 if created else 200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def event_templates_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        templates = EventTemplate.objects.filter(user=user).order_by("name")
        templates_data = [
            {"id": t.id, "name": t.name, "template": t.template} for t in templates
        ]
        return JsonResponse({"event_templates": templates_data})

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            name = data.get("name")
            template = data.get("template")

            if not name or not template:
                return JsonResponse(
                    {"error": "Name and template are required"}, status=400
                )

            event_template = EventTemplate.objects.create(
                user=user, name=name, template=template
            )
            return JsonResponse(
                {
                    "id": event_template.id,
                    "name": event_template.name,
                    "template": event_template.template,
                },
                status=201,
            )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            template_id = data.get("id")
            name = data.get("name")
            template = data.get("template")

            if not template_id or not name or not template:
                return JsonResponse(
                    {"error": "ID, name, and template are required"}, status=400
                )

            event_template = EventTemplate.objects.get(id=template_id, user=user)
            event_template.name = name
            event_template.template = template
            event_template.save()

            return JsonResponse(
                {
                    "id": event_template.id,
                    "name": event_template.name,
                    "template": event_template.template,
                }
            )

        except EventTemplate.DoesNotExist:
            return JsonResponse({"error": "Template not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        try:
            data = json.loads(request.body)
            template_id = data.get("id")
            if not template_id:
                return JsonResponse({"error": "ID is required"}, status=400)

            event_template = EventTemplate.objects.get(id=template_id, user=user)
            event_template.delete()

            return JsonResponse({"success": True})

        except EventTemplate.DoesNotExist:
            return JsonResponse({"error": "Template not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def exercise_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        try:

            exercise = (
                Exercise.objects.filter(user=user).order_by("-updated_at").first()
            )
            if exercise:
                exercise_data = {
                    "id": exercise.id,
                    "content": exercise.content,
                    "created_at": (
                        exercise.created_at.isoformat() if exercise.created_at else None
                    ),
                    "updated_at": (
                        exercise.updated_at.isoformat() if exercise.updated_at else None
                    ),
                }
                return JsonResponse({"exercise": exercise_data})
            else:
                return JsonResponse({"exercise": None})
        except Exception as e:

            import logging

            logging.exception("Error fetching exercise data")
            return JsonResponse({"error": "Internal server error"}, status=500)

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            content = data.get("content", "")

            exercise, created = Exercise.objects.get_or_create(
                user=user, defaults={"content": content}
            )

            if not created:
                exercise.content = content
                exercise.save()

            exercise_data = {
                "id": exercise.id,
                "content": exercise.content,
                "created_at": (
                    exercise.created_at.isoformat() if exercise.created_at else None
                ),
                "updated_at": (
                    exercise.updated_at.isoformat() if exercise.updated_at else None
                ),
            }

            return JsonResponse(exercise_data, status=201 if created else 200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def assigned_tasks_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    
    user.last_seen = timezone.now()
    user.save(update_fields=['last_seen'])

    
    is_developer = getattr(user, "developer", False)

    if request.method == "GET":
        user_id = request.GET.get("userId")
        date_str = request.GET.get("date")

        if not date_str:
            return JsonResponse({"error": "date parameter is required"}, status=400)

        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )

        try:
            
            
            
            
            
            if user_id:
                if str(user.id) == user_id:
                    
                    pass
                elif is_developer:
                    
                    pass
                elif getattr(user, "team_role", "") in ["Leader", "Mod"]:
                    
                    pass
                
                else:
                    return JsonResponse(
                        {"error": "You don't have permission to view these tasks"},
                        status=403,
                    )

                target_user = User.objects.get(id=user_id)
                tasks = AssignedTask.objects.filter(
                    Q(user=target_user, date=date) | 
                    Q(user=target_user, date__lt=date, done=False)
                )
                tasks_data = [
                    {"id": t.id, "title": t.title, "text": t.text, "done": t.done}
                    for t in tasks
                ]
                return JsonResponse({"tasks": tasks_data})
            else:
                
                can_view_all = (
                    getattr(user, "is_staff", False)
                    or getattr(user, "is_superuser", False)
                    or getattr(user, "team_role", "") in ["Leader", "Mod"]
                    or is_developer
                )
                
                if not can_view_all:
                    
                    if getattr(user, "team_role", "") == "Mod":
                        
                        items = []
                        
                        user_tasks = AssignedTask.objects.filter(
                            Q(user=user, date=date) | 
                            Q(user=user, date__lt=date, done=False)
                        )
                        for t in user_tasks:
                            items.append({
                                "userId": str(user.id),
                                "username": getattr(user, "username", ""),
                                "role": getattr(user, "team_role", ""),
                                "avatarUrl": getattr(user, "profile_picture_url", None),
                                "task": {
                                    "id": t.id,
                                    "title": t.title,
                                    "text": t.text,
                                    "done": t.done,
                                },
                            })
                        
                        
                        member_tasks = AssignedTask.objects.filter(
                            Q(user__team_role="Member", date=date) | 
                            Q(user__team_role="Member", date__lt=date, done=False)
                        ).select_related("user")
                        for t in member_tasks:
                            items.append({
                                "userId": str(t.user.id),
                                "username": getattr(t.user, "username", ""),
                                "role": getattr(t.user, "team_role", ""),
                                "avatarUrl": getattr(t.user, "profile_picture_url", None),
                                "task": {
                                    "id": t.id,
                                    "title": t.title,
                                    "text": t.text,
                                    "done": t.done,
                                },
                            })
                        return JsonResponse({"items": items})
                    else:
                        
                        tasks = AssignedTask.objects.filter(
                            Q(user=user, date=date) | 
                            Q(user=user, date__lt=date, done=False)
                        )
                        items = []
                        for t in tasks:
                            items.append({
                                "userId": str(user.id),
                                "username": getattr(user, "username", ""),
                                "role": getattr(user, "team_role", ""),
                                "avatarUrl": getattr(user, "profile_picture_url", None),
                                "task": {
                                    "id": t.id,
                                    "title": t.title,
                                    "text": t.text,
                                    "done": t.done,
                                },
                            })
                        return JsonResponse({"items": items})

                
                all_tasks = (
                    AssignedTask.objects.filter(
                        Q(date=date) | 
                        Q(date__lt=date, done=False)
                    )
                    .select_related("user")
                    .order_by("user__id")
                )
                grouped: dict[str, dict] = {}
                for t in all_tasks:
                    uid = str(t.user.id)
                    user_info = {
                        "userId": uid,
                        "username": getattr(t.user, "username", ""),
                        "role": getattr(t.user, "team_role", ""),
                        "avatarUrl": getattr(t.user, "profile_picture_url", None),
                    }
                    if uid not in grouped:
                        grouped[uid] = {**user_info, "tasks": []}
                    grouped[uid]["tasks"].append(
                        {
                            "id": t.id,
                            "title": t.title,
                            "text": t.text,
                            "done": t.done,
                        }
                    )

                return JsonResponse({"items": list(grouped.values())})

        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    elif request.method == "POST":
        
        
        
        
        user_team_role = getattr(user, "team_role", "")
        

        try:
            data = json.loads(request.body)
            user_id = data.get("userId")
            date_str = data.get("date")
            tasks = data.get("tasks", [])

            if not user_id or not date_str:
                return JsonResponse(
                    {"error": "userId and date are required"}, status=400
                )

            target_user = User.objects.get(id=user_id)
            
            # Refactored permission logic
            can_assign = False
            
            # Developer can assign to anyone
            if is_developer:
                can_assign = True
            
            # Leader can assign to anyone (including other Leaders)
            elif user_team_role == "Leader":
                can_assign = True
                
            # Mod can assign to Members and themselves
            elif user_team_role == "Mod":
                 if target_user.team_role == "Member" or str(user.id) == str(target_user.id):
                    can_assign = True
            
            # Members can only assign to themselves
            elif str(user.id) == str(target_user.id):
                can_assign = True

            if not can_assign:
                return JsonResponse(
                    {"error": "You do not have permission to assign tasks"}, status=403
                )

            date = datetime.strptime(date_str, "%Y-%m-%d").date()

            # Fetch existing tasks for the target user and date (including overdue tasks)
            existing_tasks = AssignedTask.objects.filter(
                Q(user=target_user, date=date) | 
                Q(user=target_user, date__lt=date, done=False)
            )
            existing_task_ids = {str(t.id) for t in existing_tasks}

            # Identify tasks to be kept (those with an ID from the frontend list)
            tasks_to_keep_ids = {str(task_data["id"]) for task_data in tasks if task_data.get("id")}

            # Identify tasks to delete (those existing but not in the frontend's list)
            tasks_to_delete_ids = existing_task_ids - tasks_to_keep_ids

            # Perform deletion
            if tasks_to_delete_ids:
                AssignedTask.objects.filter(id__in=list(tasks_to_delete_ids)).delete()

            new_tasks = []
            for task_data in tasks:
                tid = task_data.get("id")
                title = task_data.get("title")
                text = task_data.get("text")
                done = task_data.get("done", False)
                
                if tid:
                    try:
                        # Only update if the task ID was in the original existing_tasks and is in tasks_to_keep_ids
                        if tid in existing_task_ids:
                            t = AssignedTask.objects.get(id=tid)
                            if t.user_id == target_user.id:
                                t.title = title
                                t.text = text
                                t.done = done
                                t.save()
                                new_tasks.append({"id": t.id, "title": t.title, "text": t.text, "done": t.done})
                    except AssignedTask.DoesNotExist:
                        pass # This case should ideally not happen if tid is in existing_task_ids
                else:
                    # Create new tasks
                    t = AssignedTask.objects.create(
                        user=target_user,
                        assigned_by=user,
                        date=date,
                        title=title,
                        text=text,
                        done=done,
                    )
                    new_tasks.append({"id": t.id, "title": t.title, "text": t.text, "done": t.done})


            
            if tasks and (is_developer or user_team_role in ["Leader", "Mod"]):
                try:
                    
                    active_bots = Telegram.objects.filter(
                        is_active=True,
                        send_task_notifications=True
                    ).exclude(api_token__isnull=True).exclude(api_token="")
                    
                    for bot in active_bots:
                        if not bot.api_token:
                            continue
                            
                        
                        target_telegram_id = getattr(target_user, 'telegram_id', None)
                        if not target_telegram_id:
                            continue
                            
                        
                        assigner_name = (user.get_full_name() or '').strip() or user.username
                        target_name = (target_user.get_full_name() or '').strip() or target_user.username
                        
                        message_lines = [
                            f"📋 *New Tasks Assigned*",
                            f"",
                            f"👤 *Assigned by:* {assigner_name}",
                            f"🎯 *Assigned to:* {target_name}",
                            f"📅 *Date:* {date.strftime('%Y-%m-%d')}",
                            f"",
                            f"*Tasks:*"
                        ]
                        
                        for i, task_data in enumerate(tasks, 1):
                            title = task_data.get('title', '').strip()
                            text = task_data.get('text', '').strip()
                            if title:
                                task_text = f"{i}. **{title}**"
                                if text:
                                    task_text += f": {text}"
                            else:
                                task_text = f"{i}. {text}"
                            message_lines.append(task_text)
                        
                        message = "\n".join(message_lines)
                        
                        
                        try:
                            _telegram_request(
                                bot.api_token,
                                'sendMessage',
                                {
                                    'chat_id': target_telegram_id,
                                    'text': message,
                                    'parse_mode': 'Markdown'
                                }
                            )
                        except Exception as e:
                            print(f"Failed to send task notification to bot {bot.bot_name}: {e}")
                            
                except Exception as e:
                    print(f"Error in Telegram task notifications: {e}")

            return JsonResponse({"tasks": new_tasks}, status=201)

        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def reports_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    
    user.last_seen = timezone.now()
    user.save(update_fields=['last_seen'])

    if request.method == "GET":
        date_str = request.GET.get("date")
        user_id = request.GET.get("userId")

        try:
            if date_str:
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
            else:
                date = timezone.now().date()
        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )

        can_view_all = (
            getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
            or getattr(user, "team_role", "") == "Leader"
        )

        
        start_dt = datetime.combine(date, time.min) - timedelta(hours=3, minutes=30)
        end_dt = datetime.combine(date, time.max) - timedelta(hours=3, minutes=30)
        
        qs = Report.objects.filter(submitted_at__range=(start_dt, end_dt))
        
        
        try:
            with open("debug_reports.log", "a") as f:
                f.write(f"Date: {date}, Start: {start_dt}, End: {end_dt}\n")
                f.write(f"Count: {qs.count()}\n")
                for r in qs:
                    f.write(f"Report: {r.id}, Submitted: {r.submitted_at}\n")
        except Exception as e:
            pass
            
        if user_id:
            qs = qs.filter(user__id=user_id)
        elif not can_view_all:
            qs = qs.filter(user=user)

        items = []
        for r in qs.select_related("user").prefetch_related("images"):
            try:
                tasks = json.loads(r.tasks or "[]")
            except Exception:
                tasks = []
            name = (
                getattr(r.user, "get_full_name", lambda: "")() or ""
            ).strip() or getattr(r.user, "username", "")
            
            # Get image URLs
            image_urls = [img.image.url for img in r.images.all()]
            
            items.append(
                {
                    "id": r.id,
                    "userId": str(r.user.id),
                    "name": name,
                    "role": getattr(r.user, "team_role", ""),
                    "type": getattr(r.user, "team_role", ""),
                    "avatarUrl": getattr(r.user, "profile_picture_url", None),
                    "tasks": tasks,
                    "note": r.note or "",
                    "noteType": r.note_type,
                    "submittedAt": r.submitted_at.isoformat(),
                    "status": r.status,
                    "rating": r.rating,
                    "images": image_urls,
                }
            )
        return JsonResponse({"reports": items})

    elif request.method == "POST":
        # Handle multipart/form-data for image uploads
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Get JSON data from form field
            try:
                json_data = request.POST.get('data', '{}')
                data = json.loads(json_data)
            except (json.JSONDecodeError, ValueError):
                return JsonResponse({"error": "Invalid JSON in form data"}, status=400)
            
            # Get uploaded images
            images = request.FILES.getlist('images')
        else:
            # Handle regular JSON request
            try:
                data = json.loads(request.body or "{}")
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON"}, status=400)
            images = []

        raw_tasks = data.get("tasks") or []
        normalized = []
        for t in raw_tasks:
            text = str(t.get("text") or "").strip()
            done = bool(t.get("done"))
            title = t.get("title")
            tid = str(t.get("id") or "")
            if not text and not title:
                continue
            item = {"id": tid, "text": text, "done": done}
            if title is not None:
                item["title"] = title
            normalized.append(item)

        note = str(data.get("note") or "")
        note_type = str(data.get("noteType") or "text")

        
        local_now = timezone.now() + timedelta(hours=3, minutes=30)
        today = local_now.date()
        
        
        start_dt = datetime.combine(today, time.min) - timedelta(hours=3, minutes=30)
        end_dt = datetime.combine(today, time.max) - timedelta(hours=3, minutes=30)
        
        try:
            with open("debug_reports_post.log", "a") as f:
                f.write(f"POST Report: User={user.username}, LocalNow={local_now}, Range={start_dt} to {end_dt}\n")
        except:
            pass

        r = Report.objects.create(
            user=user,
            tasks=json.dumps(normalized),
            note=note,
            note_type=note_type,
            status="pending",
        )
        
        # Save uploaded images
        for image in images:
            ReportImage.objects.create(report=r, image=image)
        
        try:
            with open("debug_reports_post.log", "a") as f:
                f.write(f"Created new report: {r.id} with {len(images)} images\n")
        except:
            pass

        # Create notification for the user who submitted the report
        create_notification(
            user=user,
            message=f"Your report for {r.submitted_at.strftime('%Y-%m-%d')} has been submitted successfully.",
            link=f"/reports/{r.id}" # Assuming a report detail page exists at /reports/{id}
        )

        try:
            tasks = json.loads(r.tasks or "[]")
        except Exception:
            tasks = []
        name = (
            getattr(r.user, "get_full_name", lambda: "")() or ""
        ).strip() or getattr(r.user, "username", "")
        try:
            receivers = Telegram.objects.filter(send_report=True, is_active=True).exclude(api_token__isnull=True).exclude(api_token="")
            if receivers.exists():
                lines = []
                for t in tasks:
                    title = str(t.get("title") or t.get("text") or "").strip()
                    done = bool(t.get("done"))
                    if title:
                        lines.append(f"- {'[x]' if done else '[ ]'} {title}")
                summary = "\n".join(lines[:10])
                msg = (
                    f"New report submitted by {name}\n"
                    f"Status: {r.status}\n"
                    f"Tasks: {len(tasks)} items\n\n"
                    f"{summary}"
                ).strip()
                chat_id = 2006833036
                for rec in receivers:
                    token = str(rec.api_token or "").strip()
                    if not token:
                        continue
                    try:
                        
                        try:
                            webhook_url = request.build_absolute_uri('/api/telegram/webhook/')
                            set_webhook_url = f"https://api.telegram.org/bot{token}/setWebhook"
                            wh_payload = json.dumps({
                                "url": webhook_url,
                                "allowed_updates": ["callback_query", "message"],
                                "drop_pending_updates": False
                            }).encode("utf-8")
                            wh_req = urllib.request.Request(set_webhook_url, data=wh_payload, headers={"Content-Type": "application/json"})
                            with urllib.request.urlopen(wh_req, timeout=10) as wh_resp:
                                _ = wh_resp.read()
                        except Exception:
                            pass
                        url = f"https://api.telegram.org/bot{token}/sendMessage"
                        reply_markup = {
                            "inline_keyboard": [
                                [
                                    {"text": "approved", "callback_data": f"report:{r.id}:approve:owner:{rec.user_id}"},
                                    {"text": "decline", "callback_data": f"report:{r.id}:decline:owner:{rec.user_id}"},
                                    {"text": "see detail", "callback_data": f"report:{r.id}:detail:owner:{rec.user_id}"},
                                ]
                            ]
                        }
                        payload = json.dumps({"chat_id": chat_id, "text": msg, "reply_markup": reply_markup}).encode("utf-8")
                        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
                        with urllib.request.urlopen(req, timeout=10) as resp:
                            _ = resp.read()
                    except Exception:
                        pass
        except Exception:
            pass
        # Get image URLs for response
        image_urls = [img.image.url for img in r.images.all()]
        
        return JsonResponse(
            {
                "id": r.id,
                "userId": str(r.user.id),
                "name": name,
                "role": getattr(r.user, "team_role", ""),
                "type": getattr(r.user, "team_role", ""),
                "avatarUrl": getattr(r.user, "profile_picture_url", None),
                "tasks": tasks,
                "note": r.note or "",
                "noteType": r.note_type,
                "submittedAt": r.submitted_at.isoformat(),
                "status": r.status,
                "rating": r.rating,
                "images": image_urls,
            },
            status=201,
        )

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def report_detail_api(request, report_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        r = Report.objects.select_related("user").get(id=report_id)
    except Report.DoesNotExist:
        return JsonResponse({"error": "Report not found"}, status=404)

    is_owner = str(r.user.id) == str(user.id)
    is_admin = (
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "team_role", "") == "Leader"
    )

    if request.method == "GET":
        try:
            tasks = json.loads(r.tasks or "[]")
        except Exception:
            tasks = []
        name = (
            getattr(r.user, "get_full_name", lambda: "")() or ""
        ).strip() or getattr(r.user, "username", "")
        
        # Get image URLs
        image_urls = [img.image.url for img in r.images.all()]
        
        return JsonResponse(
            {
                "id": r.id,
                "userId": str(r.user.id),
                "name": name,
                "role": getattr(r.user, "team_role", ""),
                "type": getattr(r.user, "team_role", ""),
                "avatarUrl": getattr(r.user, "profile_picture_url", None),
                "tasks": tasks,
                "note": r.note or "",
                "noteType": r.note_type,
                "submittedAt": r.submitted_at.isoformat(),
                "status": r.status,
                "rating": r.rating,
                "images": image_urls,
            }
        )

    elif request.method in ["PUT", "PATCH"]:
        try:
            data = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        if "status" in data or "rating" in data:
            if not is_admin:
                return JsonResponse({"error": "Not authorized"}, status=403)
            status_val = data.get("status", r.status)
            rating_val = data.get("rating", r.rating)
            if status_val not in ["pending", "approved", "declined"]:
                return JsonResponse({"error": "Invalid status"}, status=400)
            if "rating" in data:
                target_status = status_val if "status" in data else r.status
                if target_status != "approved":
                    return JsonResponse(
                        {"error": "Rating can only be set when report is approved"},
                        status=400,
                    )
            r.status = status_val
            r.rating = rating_val if rating_val in [1, 2, 3, 4, 5, None] else None
            r.save()
            if "rating" in data:
                Submission.objects.filter(
                    user=r.user, date=r.submitted_at.date()
                ).update(rating=r.rating)
        else:
            if not is_owner:
                return JsonResponse({"error": "Not authorized"}, status=403)
            if r.status != "pending":
                return JsonResponse({"error": "Editing not allowed"}, status=403)
            raw_tasks = data.get("tasks") or []
            normalized = []
            for t in raw_tasks:
                text = str(t.get("text") or "").strip()
                done = bool(t.get("done")),
                title = t.get("title")
                tid = str(t.get("id") or "")
                if not text and not title:
                    continue
                item = {"id": tid, "text": text, "done": done}
                if title is not None:
                    item["title"] = title
                normalized.append(item)
            r.tasks = json.dumps(normalized)
            r.note = str(data.get("note") or "")
            r.note_type = str(data.get("noteType") or "text")
            r.save()
        return JsonResponse({"success": True})

    elif request.method == "DELETE":
        if not is_owner:
            return JsonResponse({"error": "Not authorized"}, status=403)
        if r.status != "pending":
            return JsonResponse({"error": "Deleting not allowed"}, status=403)
        
        report_date = r.submitted_at.date()
        r.delete()
        try:
            Submission.objects.filter(user=r.user, date=report_date).delete()
        except Exception:
            pass
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def submissions_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        date_str = request.GET.get("date")
        user_id_param = request.GET.get("userId")

        try:
            if date_str:
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
            else:
                date = timezone.now().date()

            can_view_all = (
                getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
                or getattr(user, "team_role", "") == "Leader"
            )

            
            start_dt = datetime.combine(date, time.min) - timedelta(hours=3, minutes=30)
            end_dt = datetime.combine(date, time.max) - timedelta(hours=3, minutes=30)

            sub_qs = Submission.objects.filter(date=date)
            rep_qs = Report.objects.filter(submitted_at__range=(start_dt, end_dt))

            if user_id_param:
                sub_qs = sub_qs.filter(user__id=user_id_param)
                rep_qs = rep_qs.filter(user__id=user_id_param)
            elif not can_view_all:
                sub_qs = sub_qs.filter(user=user)
                rep_qs = rep_qs.filter(user=user)

            submissions_data = [
                {
                    "id": s.id,
                    "userId": str(s.user.id),
                    "username": s.user.username,
                    "date": s.date.isoformat(),
                    "report": s.report,
                    "rating": s.rating,
                    "created_at": s.created_at.isoformat(),
                }
                for s in sub_qs.select_related("user")
            ]

            items = []
            for r in rep_qs.select_related("user"):
                try:
                    tasks = json.loads(r.tasks or "[]")
                except Exception:
                    tasks = []
                name = (
                    getattr(r.user, "get_full_name", lambda: "")() or ""
                ).strip() or getattr(r.user, "username", "")
                items.append(
                    {
                        "id": r.id,
                        "userId": str(r.user.id),
                        "name": name,
                        "role": getattr(r.user, "team_role", ""),
                        "type": getattr(r.user, "team_role", ""),
                        "avatarUrl": getattr(r.user, "profile_picture_url", None),
                        "tasks": tasks,
                        "note": r.note or "",
                        "noteType": r.note_type,
                        "submittedAt": r.submitted_at.isoformat(),
                        "status": r.status,
                        "rating": r.rating,
                    }
                )

            return JsonResponse({"submissions": submissions_data, "reports": items})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            date_str = data.get("date")
            report = data.get("report")
            rating = data.get("rating")

            if not date_str or not report:
                return JsonResponse(
                    {"error": "Date and report are required"}, status=400
                )

            date = datetime.strptime(date_str, "%Y-%m-%d").date()

            existing = Submission.objects.filter(user=user, date=date).first()
            if existing:
                existing.report = report
                existing.rating = rating if rating in [1, 2, 3, 4, 5, None] else None
                existing.save()
                submission = existing
            else:
                submission = Submission.objects.create(
                    user=user,
                    date=date,
                    report=report,
                    rating=rating if rating in [1, 2, 3, 4, 5, None] else None,
                )

            submission_data = {
                "id": submission.id,
                "username": submission.user.username,
                "date": submission.date.isoformat(),
                "report": submission.report,
                "rating": submission.rating,
                "created_at": submission.created_at.isoformat(),
            }

            return JsonResponse({"submission": submission_data}, status=201 if not existing else 200)

        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_notifications(request):
    try:
        auth_header = request.headers.get("Authorization")
        
        # Manual user retrieval to catch errors during auth
        user = None
        if auth_header and auth_header.startswith("Token "):
            try:
                token_key = auth_header.split(" ")[1]
                token = Token.objects.get(key=token_key)
                user = token.user
            except Exception as e:
                pass # User remains None

        if not user:
            return JsonResponse({"error": "Authentication required"}, status=401)

        if request.method == "GET":
            notifications = Notification.objects.filter(user=user).order_by('-created_at')
            notifications_data = [
                {
                    "id": n.id,
                    "message": n.message,
                    "link": n.link,
                    "is_read": n.is_read,
                    "is_saved": n.is_saved,
                    "created_at": n.created_at.isoformat(),
                }
                for n in notifications
            ]
            return JsonResponse({"notifications": notifications_data})
            
        return JsonResponse({"error": "Method not allowed"}, status=405)

    except Exception as e:
        import traceback
        with open("backend_error.log", "a") as f:
            f.write(f"CRITICAL Error in api_notifications:\n")
            f.write(f"Auth Header: {request.headers.get('Authorization')}\n")
            f.write(f"Exception: {str(e)}\n")
            f.write(traceback.format_exc())
            f.write("\n" + "-"*20 + "\n")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PUT"])
def api_toggle_notification_saved(request, notification_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        notification = Notification.objects.get(id=notification_id, user=user)
        notification.is_saved = not notification.is_saved
        notification.save()
        return JsonResponse({
            "success": True, 
            "message": "Notification saved status updated",
            "is_saved": notification.is_saved
        })
    except Notification.DoesNotExist:
        return JsonResponse({"error": "Notification not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PUT"])
def api_mark_notification_read(request, notification_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        notification = Notification.objects.get(id=notification_id, user=user)
        notification.is_read = True
        notification.save()
        return JsonResponse({"success": True, "message": "Notification marked as read"})
    except Notification.DoesNotExist:
        return JsonResponse({"error": "Notification not found or not owned by user"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PUT"])
def api_mark_all_notifications_read(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return JsonResponse({"success": True, "message": "All notifications marked as read"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def reports_all_api(request):
    """Get all reports from all users and dates for admin/leader users"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)
        
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    # Check permission - only leaders, admins, or developers can see all reports
    is_admin = (
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "team_role", "") == "Leader"
        or getattr(user, "developer", False)
    )
    
    if not is_admin:
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    try:
        # Get all reports with user information
        all_reports = Report.objects.select_related('user').all().order_by('-submitted_at')
        reports_data = []
        
        for r in all_reports:
            try:
                tasks_list = json.loads(r.tasks or "[]")
            except (json.JSONDecodeError, TypeError):
                tasks_list = []
            
            # Convert tasks to expected format
            formatted_tasks = []
            for task in tasks_list:
                if isinstance(task, dict):
                    formatted_tasks.append({
                        "id": task.get("id", ""),
                        "text": task.get("text", ""),
                        "done": task.get("done", False)
                    })
                elif isinstance(task, str):
                    formatted_tasks.append({
                        "id": "",
                        "text": task,
                        "done": False
                    })
            
            user_obj = r.user
            user_name = (user_obj.get_full_name() or "").strip() or user_obj.username
            user_role = getattr(user_obj, "team_role", "Member")
            
            reports_data.append({
                "id": str(r.id),
                "userId": str(user_obj.id),
                "name": user_name,
                "role": user_role,
                "type": user_role,
                "avatarUrl": getattr(user_obj, "profile_picture_url", None),
                "tasks": formatted_tasks,
                "note": r.note or "",
                "noteType": r.note_type or "text",
                "submittedAt": r.submitted_at.isoformat(),
                "status": r.status,
                "rating": r.rating,
            })
        
        return JsonResponse({"reports": reports_data})
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def submissions_all_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        try:
            
            can_view_all = (
                getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
                or getattr(user, "team_role", "") == "Leader"
                or getattr(user, "developer", False)
            )

            if not can_view_all:
                return JsonResponse({"error": "Permission denied"}, status=403)


            
            sub_qs = Submission.objects.select_related("user").order_by("-created_at")
            rep_qs = Report.objects.select_related("user").order_by("-submitted_at")

            submissions_data = [
                {
                    "id": s.id,
                    "userId": str(s.user.id),
                    "username": s.user.username,
                    "date": s.date.isoformat(),
                    "report": s.report,
                    "rating": s.rating,
                    "status": s.status,
                    "created_at": s.created_at.isoformat(),
                }
                for s in sub_qs
            ]

            items = []
            for r in rep_qs:
                try:
                    tasks = json.loads(r.tasks or "[]")
                except Exception:
                    tasks = []
                name = (
                    getattr(r.user, "get_full_name", lambda: "")() or ""
                ).strip() or getattr(r.user, "username", "")
                items.append(
                    {
                        "id": r.id,
                        "userId": str(r.user.id),
                        "name": name,
                        "role": getattr(r.user, "team_role", ""),
                        "type": getattr(r.user, "team_role", ""),
                        "avatarUrl": getattr(r.user, "profile_picture_url", None),
                        "tasks": tasks,
                        "note": r.note or "",
                        "noteType": r.note_type,
                        "submittedAt": r.submitted_at.isoformat(),
                        "status": r.status,
                        "rating": r.rating,
                    }
                )

            return JsonResponse({"submissions": submissions_data, "reports": items})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def employee_todos_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        date_str = request.GET.get("date")
        
        try:
            if date_str:
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
            else:
                date = timezone.now().date()
                
            todos = EmployeeTodo.objects.filter(user=user, date=date)
            todos_data = [
                {
                    "id": str(todo.id),
                    "text": todo.text,
                    "done": todo.done,
                    "date": todo.date.isoformat(),
                    "createdAt": todo.created_at.isoformat() if todo.created_at else None,
                    "updatedAt": todo.updated_at.isoformat() if todo.updated_at else None,
                }
                for todo in todos
            ]
            
            return JsonResponse({"todos": todos_data})
            
        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            date_str = data.get("date")
            todos = data.get("todos", [])
            
            if not date_str:
                return JsonResponse({"error": "Date is required"}, status=400)
                
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            
            EmployeeTodo.objects.filter(user=user, date=date).delete()
            
            
            created_todos = []
            for todo_data in todos:
                todo = EmployeeTodo.objects.create(
                    user=user,
                    text=todo_data.get("text", ""),
                    done=todo_data.get("done", False),
                    date=date
                )
                created_todos.append({
                    "id": str(todo.id),
                    "text": todo.text,
                    "done": todo.done,
                    "date": todo.date.isoformat(),
                    "createdAt": todo.created_at.isoformat() if todo.created_at else None,
                    "updatedAt": todo.updated_at.isoformat() if todo.updated_at else None,
                })
            
            return JsonResponse({"todos": created_todos}, status=201)
            
        except ValueError:
            return JsonResponse(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def google_sheets_upload_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "POST":
        try:
            import os
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
            
            data = json.loads(request.body)
            
            
            upload_users = data.get('upload_users', True)
            upload_submissions = data.get('upload_submissions', True)
            upload_reports = data.get('upload_reports', True)
            
            
            users_data = []
            submissions_data = []
            reports_data = []
            
            
            if upload_users:
                all_users = User.objects.all()
                for u in all_users:
                    full_name = (u.get_full_name() or '').strip() or u.username
                    users_data.append({
                        'id': u.id,
                        'username': u.username,
                        'email': u.email,
                        'name': full_name,
                        'team_role': getattr(u, 'team_role', None),
                        'is_staff': u.is_staff,
                        'is_superuser': u.is_superuser,
                        'developer': getattr(u, 'developer', False),
                        'is_validate': getattr(u, 'is_validate', False),
                        'telegram_id': getattr(u, 'telegram_id', None),
                    })
            
            
            if upload_submissions:
                all_submissions = Submission.objects.select_related('user').all()
                for s in all_submissions:
                    submissions_data.append({
                        'id': s.id,
                        'userId': str(s.user.id),
                        'username': s.user.username,
                        'date': s.date.isoformat(),
                        'report': s.report,
                        'rating': s.rating,
                        'created_at': s.created_at.isoformat(),
                    })
            
            
            if upload_reports:
                all_reports = Report.objects.select_related('user').all()
                for r in all_reports:
                    try:
                        tasks = json.loads(r.tasks or "[]")
                    except Exception:
                        tasks = []
                    name = (getattr(r.user, "get_full_name", lambda: "")() or "").strip() or getattr(r.user, "username", "")
                    reports_data.append({
                        'id': r.id,
                        'userId': str(r.user.id),
                        'name': name,
                        'role': getattr(r.user, 'team_role', ''),
                        'type': getattr(r.user, 'team_role', ''),
                        'tasks': tasks,
                        'note': r.note or '',
                        'noteType': r.note_type,
                        'submittedAt': r.submitted_at.isoformat(),
                        'status': r.status,
                        'rating': r.rating,
                    })
            
            
            service_account_info = {
                "type": "service_account",
                "project_id": "ixiu-467500",
                "private_key_id": "48cf4ec8b97e5e71d85ed5ac2ee151a079fe4d52",
                "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDX5enyvcXJR6a7\nhW2Tppz1ZoHV05v6K/5wdI86scR0caD+PO08w8AfUsptIFDbNMCoMIaEg91gEz3t\n812k8E3tZAkftyFiR0Y4aaFqSuObmck+MYkO/d9diUpseCCtYJRKzUc+aMk4GrsP\nch95oROxozhNfhhxiIBi2tds9p3H2OtHErxWUuZp3FsL4n+8cHm9m/6UqW43S1dj\nFfx2/UTQD9S6hV05EwQ27WEGvOl1guprE4Yx4MEQgYfCvq+daA7zUGvvJuxZvWUk\nVB1KqNqCvFy4vg94Vtsb1eUoB3gTfSO27C1lUVYpZHqOnTvOJrK27xHR4aENr/km\nXMeV8T+jAgMBAAECggEAFKuH9vwRTCCGh4ySPaElhN8wDgtI8y40GYsnTVzIrMdW\nPRETO46YPcd85u7BnwMRcOjYcCZ50uF0u+vhatGw/EnoD7fGQ/UD9ZGzaQxLd1HF\ncSVn9F38/SUQUYs8wayt9e1qZUC+BxeUEjoAZnI0Av1X/h9U8sW5WP2Pw3hnCcN/\nWoVp7urwiC3hk03S2oXD7cepaKpAsoFHELom4Xo9uAZVGpy7+WEntz43Oxf6XpgE\n+31aG2mAXm6iBclt6BFsq2/HHBLapNGuQbEetvrwgGEZ4OpYMLLyRExwuG9BxgmG\nqnUJVjEkxw0pB5DZJcNEL9yCgyPFppRuInKJ1zzSZQKBgQDs0dkI8AS44HKdJRcq\n7H7HNoe/E3dBLnoQfqW7pwk7Shc9aCEn9z3Ody/RqQvUSnSHa79cInIYOTnizYES\n+8pQyOvKNQrj7mrYcbyL6TQK98/McfQV8e0sBpKTed9pzsUL9ZW3B3xRaM8LfEI0\n+8R+msVSWelmELW1DuIrZsjJjQKBgQDpYkiDWBJD2XyZ+DMZjnSGVt7AYPUVXCHa\nq4N3MYrD2KuyuKnUbxhiJMOj6qW95NgEe9EHaQZXu621I3LeUcw5jPfbXPblXWqz\nPQ1XUW+cBQOa533GuimBvoN59H8nxuEmV4jwweUixe5atAfjR8oP6kbnnBteKfTU\nsS+mC+up7wKBgQDPxURfHQVnljO4P0RWOmr4KJVsRI3KOBaLxjFts5zb0aMWEveT\n8szdCaCAl4lzVWdrMFMRaH8lVX+9xoLJvvK/cae9HlBRrWk8QH0lWxJ31PcQ7aEy\nZ7CngZSzoqcqU2h5l5skm4KsggG0l+4WQhUg5nTcTVoCXAKvuUEgxuq+OQKBgArn\ncqfgV4ogAThYZlrNUxhruqCWZx0GXvaOiOfqwqb/2pXRFu47+pGrUhC4h+HlbUpY\nVp3YBFnZBPavn1BP1hDiSzpOj6KLyM5zDcqEnYhWm6KDKlc8n2/WbOIn0EEVg7N8\n54MILCKByO8n9i5iTkiME6ACpSyzHSNK3AUQDYS1AoGABA6eTjeaD992R2LloFKZ\ns2UmtB5i0xtwHWltZfOvTDotGHzpTBiEL6BAREU7xHEHKeu4Iw5rQEYvfpAIn4Lq\ndFfh4xo4pz3lGFca2IS5JVCbOPv/BNRAdVOw9IyfcI3vi7/XQmy8mLBtPiqSdTeL\n/7c0qrZaTU2AOGTa250BeVA=\n-----END PRIVATE KEY-----\n",
                "client_email": "planner-database@ixiu-467500.iam.gserviceaccount.com",
                "client_id": "111638891103940680426",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/planner-database%40ixiu-467500.iam.gserviceaccount.com",
                "universe_domain": "googleapis.com"
            }
            
            
            creds = Credentials.from_service_account_info(
                service_account_info,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            
            service = build('sheets', 'v4', credentials=creds)
            sheet = service.spreadsheets()
            
            
            spreadsheet_id = "1pC1DxqvYVT3y-e3K8N8r_ShPMSKItK9CKtyQ2LIxhN0"
            
            
            try:
                spreadsheet = sheet.get(spreadsheetId=spreadsheet_id).execute()
                existing_sheets = spreadsheet.get('sheets', [])
                sheet_titles = [s.get('properties', {}).get('title', '') for s in existing_sheets]
            except Exception as e:
                raise Exception(f"Failed to get spreadsheet metadata: {str(e)}")
            
            
            def ensure_sheet_exists(sheet_name):
                if sheet_name not in sheet_titles:
                    try:
                        
                        batch_update_request = {
                            "requests": [
                                {
                                    "addSheet": {
                                        "properties": {
                                            "title": sheet_name
                                        }
                                    }
                                }
                            ]
                        }
                        sheet.batchUpdate(
                            spreadsheetId=spreadsheet_id,
                            body=batch_update_request
                        ).execute()
                        sheet_titles.append(sheet_name)
                    except Exception as e:
                        raise Exception(f"Failed to create sheet '{sheet_name}': {str(e)}")
            
            
            def upload_to_sheet(sheet_name, data):
                try:
                    
                    sheet.values().clear(
                        spreadsheetId=spreadsheet_id,
                        range=f"{sheet_name}!A:Z"
                    ).execute()
                    
                    
                    result = sheet.values().update(
                        spreadsheetId=spreadsheet_id,
                        range=f"{sheet_name}!A1",
                        valueInputOption="RAW",
                        body={"values": data}
                    ).execute()
                    return result
                except Exception as e:
                    raise Exception(f"Failed to upload data to sheet '{sheet_name}': {str(e)}")
            
            
            total_rows_updated = 0
            total_cols_updated = 0
            
            
            if upload_users and users_data:
                ensure_sheet_exists("Users")
                users_sheet_data = [["ID", "Username", "Email", "Name", "Team Role", "Is Staff", "Is Superuser", "Developer", "Is Validate", "Telegram ID"]]
                for user_data in users_data:
                    users_sheet_data.append([
                        user_data.get('id', ''),
                        user_data.get('username', ''),
                        user_data.get('email', ''),
                        user_data.get('name', ''),
                        user_data.get('team_role', ''),
                        user_data.get('is_staff', False),
                        user_data.get('is_superuser', False),
                        user_data.get('developer', False),
                        user_data.get('is_validate', False),
                        user_data.get('telegram_id', '')
                    ])
                result = upload_to_sheet("Users", users_sheet_data)
                total_rows_updated += result.get('updatedRows', 0)
                total_cols_updated += result.get('updatedColumns', 0)
            
            
            if upload_submissions and submissions_data:
                ensure_sheet_exists("Submissions")
                submissions_sheet_data = [["ID", "User ID", "Username", "Date", "Report", "Rating", "Created At"]]
                for submission in submissions_data:
                    submissions_sheet_data.append([
                        submission.get('id', ''),
                        submission.get('userId', ''),
                        submission.get('username', ''),
                        submission.get('date', ''),
                        submission.get('report', ''),
                        submission.get('rating', ''),
                        submission.get('created_at', '')
                    ])
                result = upload_to_sheet("Submissions", submissions_sheet_data)
                total_rows_updated += result.get('updatedRows', 0)
                total_cols_updated += result.get('updatedColumns', 0)
            
            
            if upload_reports and reports_data:
                ensure_sheet_exists("Reports")
                reports_sheet_data = [["ID", "User ID", "Name", "Role", "Type", "Note", "Note Type", "Submitted At", "Status", "Rating"]]
                for report in reports_data:
                    reports_sheet_data.append([
                        report.get('id', ''),
                        report.get('userId', ''),
                        report.get('name', ''),
                        report.get('role', ''),
                        report.get('type', ''),
                        report.get('note', ''),
                        report.get('noteType', ''),
                        report.get('submittedAt', ''),
                        report.get('status', ''),
                        report.get('rating', '')
                    ])
                result = upload_to_sheet("Reports", reports_sheet_data)
                total_rows_updated += result.get('updatedRows', 0)
                total_cols_updated += result.get('updatedColumns', 0)
            
            
            uploaded_types = []
            if upload_users and users_data:
                uploaded_types.append(f"{len(users_data)} users")
            if upload_submissions and submissions_data:
                uploaded_types.append(f"{len(submissions_data)} submissions")
            if upload_reports and reports_data:
                uploaded_types.append(f"{len(reports_data)} reports")
            
            message = f"Uploaded {', '.join(uploaded_types)} to separate Google Sheets successfully"
            
            return JsonResponse({
                "success": True,
                "message": message,
                "users_count": len(users_data) if upload_users else 0,
                "submissions_count": len(submissions_data) if upload_submissions else 0,
                "reports_count": len(reports_data) if upload_reports else 0,
                "rows_updated": total_rows_updated,
                "cols_updated": total_cols_updated
            })
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
def google_sheets_download_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "POST":
        try:
            import os
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
            
            data = json.loads(request.body)
            
            
            
            users_data = []
            all_users = User.objects.all()
            for u in all_users:
                full_name = (u.get_full_name() or '').strip() or u.username
                users_data.append({
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'name': full_name,
                    'team_role': getattr(u, 'team_role', None),
                    'is_staff': u.is_staff,
                    'is_superuser': u.is_superuser,
                    'developer': getattr(u, 'developer', False),
                    'is_validate': getattr(u, 'is_validate', False),
                    'telegram_id': getattr(u, 'telegram_id', None),
                })
            
            
            all_submissions = Submission.objects.select_related('user').all()
            submissions_data = []
            for s in all_submissions:
                submissions_data.append({
                    'id': s.id,
                    'userId': str(s.user.id),
                    'username': s.user.username,
                    'date': s.date.isoformat(),
                    'report': s.report,
                    'rating': s.rating,
                    'created_at': s.created_at.isoformat(),
                })
            
            
            all_reports = Report.objects.select_related('user').all()
            reports_data = []
            for r in all_reports:
                try:
                    tasks = json.loads(r.tasks or "[]")
                except Exception:
                    tasks = []
                name = (getattr(r.user, "get_full_name", lambda: "")() or "").strip() or getattr(r.user, "username", "")
                reports_data.append({
                    'id': r.id,
                    'userId': str(r.user.id),
                    'name': name,
                    'role': getattr(r.user, 'team_role', ''),
                    'type': getattr(r.user, 'team_role', ''),
                    'tasks': tasks,
                    'note': r.note or '',
                    'noteType': r.note_type,
                    'submittedAt': r.submitted_at.isoformat(),
                    'status': r.status,
                    'rating': r.rating,
                })
            
            
            service_account_info = {
                "type": "service_account",
                "project_id": "ixiu-467500",
                "private_key_id": "48cf4ec8b97e5e71d85ed5ac2ee151a079fe4d52",
                "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDX5enyvcXJR6a7\nhW2Tppz1ZoHV05v6K/5wdI86scR0caD+PO08w8AfUsptIFDbNMCoMIaEg91gEz3t\n812k8E3tZAkftyFiR0Y4aaFqSuObmck+MYkO/d9diUpseCCtYJRKzUc+aMk4GrsP\nch95oROxozhNfhhxiIBi2tds9p3H2OtHErxWUuZp3FsL4n+8cHm9m/6UqW43S1dj\nFfx2/UTQD9S6hV05EwQ27WEGvOl1guprE4Yx4MEQgYfCvq+daA7zUGvvJuxZvWUk\nVB1KqNqCvFy4vg94Vtsb1eUoB3gTfSO27C1lUVYpZHqOnTvOJrK27xHR4aENr/km\nXMeV8T+jAgMBAAECggEAFKuH9vwRTCCGh4ySPaElhN8wDgtI8y40GYsnTVzIrMdW\nPRETO46YPcd85u7BnwMRcOjYcCZ50uF0u+vhatGw/EnoD7fGQ/UD9ZGzaQxLd1HF\ncSVn9F38/SUQUYs8wayt9e1qZUC+BxeUEjoAZnI0Av1X/h9U8sW5WP2Pw3hnCcN/\nWoVp7urwiC3hk03S2oXD7cepaKpAsoFHELom4Xo9uAZVGpy7+WEntz43Oxf6XpgE\n+31aG2mAXm6iBclt6BFsq2/HHBLapNGuQbEetvrwgGEZ4OpYMLLyRExwuG9BxgmG\nqnUJVjEkxw0pB5DZJcNEL9yCgyPFppRuInKJ1zzSZQKBgQDs0dkI8AS44HKdJRcq\n7H7HNoe/E3dBLnoQfqW7pwk7Shc9aCEn9z3Ody/RqQvUSnSHa79cInIYOTnizYES\n+8pQyOvKNQrj7mrYcbyL6TQK98/McfQV8e0sBpKTed9pzsUL9ZW3B3xRaM8LfEI0\n+8R+msVSWelmELW1DuIrZsjJjQKBgQDpYkiDWBJD2XyZ+DMZjnSGVt7AYPUVXCHa\nq4N3MYrD2KuyuKnUbxhiJMOj6qW95NgEe9EHaQZXu621I3LeUcw5jPfbXPblXWqz\nPQ1XUW+cBQOa533GuimBvoN59H8nxuEmV4jwweUixe5atAfjR8oP6kbnnBteKfTU\nsS+mC+up7wKBgQDPxURfHQVnljO4P0RWOmr4KJVsRI3KOBaLxjFts5zb0aMWEveT\n8szdCaCAl4lzVWdrMFMRaH8lVX+9xoLJvvK/cae9HlBRrWk8QH0lWxJ31PcQ7aEy\nZ7CngZSzoqcqU2h5l5skm4KsggG0l+4WQhUg5nTcTVoCXAKvuUEgxuq+OQKBgArn\ncqfgV4ogAThYZlrNUxhruqCWZx0GXvaOiOfqwqb/2pXRFu47+pGrUhC4h+HlbUpY\nVp3YBFnZBPavn1BP1hDiSzpOj6KLyM5zDcqEnYhWm6KDKlc8n2/WbOIn0EEVg7N8\n54MILCKByO8n9i5iTkiME6ACpSyzHSNK3AUQDYS1AoGABA6eTjeaD992R2LloFKZ\ns2UmtB5i0xtwHWltZfOvTDotGHzpTBiEL6BAREU7xHEHKeu4Iw5rQEYvfpAIn4Lq\ndFfh4xo4pz3lGFca2IS5JVCbOPv/BNRAdVOw9IyfcI3vi7/XQmy8mLBtPiqSdTeL\n/7c0qrZaTU2AOGTa250BeVA=\n-----END PRIVATE KEY-----\n",
                "client_email": "planner-database@ixiu-467500.iam.gserviceaccount.com",
                "client_id": "111638891103940680426",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/planner-database%40ixiu-467500.iam.gserviceaccount.com",
                "universe_domain": "googleapis.com"
            }
            
            
            creds = Credentials.from_service_account_info(
                service_account_info,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            
            service = build('sheets', 'v4', credentials=creds)
            sheet = service.spreadsheets()
            
            
            spreadsheet_id = "1pC1DxqvYVT3y-e3K8N8r_ShPMSKItK9CKtyQ2LIxhN0"
            
            
            all_data = []
            
            
            all_data.append(["=== USERS ==="])
            all_data.append(["ID", "Username", "Email", "Name", "Team Role", "Is Staff", "Is Superuser", "Developer", "Is Validate", "Telegram ID"])
            for user_data in users_data:
                all_data.append([
                    user_data.get('id', ''),
                    user_data.get('username', ''),
                    user_data.get('email', ''),
                    user_data.get('name', ''),
                    user_data.get('team_role', ''),
                    user_data.get('is_staff', False),
                    user_data.get('is_superuser', False),
                    user_data.get('developer', False),
                    user_data.get('is_validate', False),
                    user_data.get('telegram_id', '')
                ])
            all_data.append([])  
            
            
            if submissions_data:
                all_data.append(["=== SUBMISSIONS ==="])
                all_data.append(["ID", "User ID", "Username", "Date", "Report", "Rating", "Created At"])
                for submission in submissions_data:
                    all_data.append([
                        submission.get('id', ''),
                        submission.get('userId', ''),
                        submission.get('username', ''),
                        submission.get('date', ''),
                        submission.get('report', ''),
                        submission.get('rating', ''),
                        submission.get('created_at', '')
                    ])
                all_data.append([])  
            
            
            if reports_data:
                all_data.append(["=== REPORTS ==="])
                all_data.append(["ID", "User ID", "Name", "Role", "Type", "Note", "Note Type", "Submitted At", "Status", "Rating"])
                for report in reports_data:
                    all_data.append([
                        report.get('id', ''),
                        report.get('userId', ''),
                        report.get('name', ''),
                        report.get('role', ''),
                        report.get('type', ''),
                        report.get('note', ''),
                        report.get('noteType', ''),
                        report.get('submittedAt', ''),
                        report.get('status', ''),
                        report.get('rating', '')
                    ])
            
            
            try:
                
                clear_range = "A:Z"
                sheet.values().clear(
                    spreadsheetId=spreadsheet_id,
                    range=clear_range
                ).execute()
            except Exception:
                pass  
            
            
            try:
                spreadsheet = sheet.get(spreadsheetId=spreadsheet_id).execute()
                sheets = spreadsheet.get('sheets', [])
                sheet_titles = [s.get('properties', {}).get('title', '') for s in sheets]
                
                if not sheet_titles:
                    raise Exception("No sheets found in the spreadsheet")
                
                
                first_sheet_name = sheet_titles[0]
                
                result = sheet.values().append(
                    spreadsheetId=spreadsheet_id,
                    range=f"{first_sheet_name}!A1",
                    valueInputOption="RAW",
                    body={"values": all_data}
                ).execute()
                
            except Exception as e:
                
                sheet_names = ["Sheet1", "Sheet", "Data", "Main", "Submissions", "Reports"]
                result = None
                
                for sheet_name in sheet_names:
                    try:
                        result = sheet.values().append(
                            spreadsheetId=spreadsheet_id,
                            range=f"{sheet_name}!A1",
                            valueInputOption="RAW",
                            body={"values": all_data}
                        ).execute()
                        break
                    except Exception:
                        continue
                
                if not result:
                    raise Exception(f"Could not upload to any sheet. Please check sheet names in the Google Sheet: {str(e)}")
            
            return JsonResponse({
                "success": True,
                "message": "All user data, submissions, and reports uploaded to Google Sheets successfully",
                "users_count": len(users_data),
                "submissions_count": len(submissions_data),
                "reports_count": len(reports_data),
                "rows_updated": result.get('updates', {}).get('updatedRows', 0),
                "cols_updated": result.get('updates', {}).get('updatedColumns', 0)
            })
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def chat_room_general_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    room = _get_or_create_general_room()
    # Ensure requester is a member
    if not room.members.filter(id=user.id).exists():
        room.members.add(user)

    messages = ChatMessage.objects.filter(chat_room=room).order_by('timestamp')
    return JsonResponse({
        "chat_room_id": room.id,
        "is_group": True,
        "name": room.name,
        "slug": room.slug,
        "messages": [_serialize_message(m) for m in messages],
    })


@csrf_exempt
def chat_room_api(request, target_user_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        target_user = User.objects.get(id=target_user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "Target user not found"}, status=404)

    if user.id == target_user.id:
        return JsonResponse({"error": "Cannot chat with yourself"}, status=400)

    # Ensure consistent ordering for user1/user2 to avoid duplicate rooms
    if user.id < target_user.id:
        user1 = user
        user2 = target_user
    else:
        user1 = target_user
        user2 = user

    chat_room, created = ChatRoom.objects.get_or_create(
        is_group=False,
        user1=user1,
        user2=user2,
        defaults={
            'name': f'DM: {user1.username} & {user2.username}',
        }
    )

    # Handle both GET and POST requests
    if request.method in ["GET", "POST"]:
        messages = ChatMessage.objects.filter(chat_room=chat_room).order_by('timestamp')
        return JsonResponse({
            "chat_room_id": chat_room.id,
            "room_id": chat_room.id,  # Frontend expects this field
            "is_group": False,
            "name": chat_room.name,
            "messages": [_serialize_message(m) for m in messages],
        })

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def send_chat_message_api(request, chat_room_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "POST":
        try:
            message_content = ""
            image_file = None

            if request.content_type.startswith('multipart/form-data'):
                message_content = request.POST.get("message", "")
                if "image" in request.FILES:
                    image_file = request.FILES["image"]
            else:
                data = json.loads(request.body)
                message_content = data.get("message", "")

            if not message_content and not image_file:
                 return JsonResponse({"error": "Message content or image is required"}, status=400)

            chat_room = ChatRoom.objects.get(id=chat_room_id)

            
            if not _user_in_room(user, chat_room):
                return JsonResponse({"error": "You are not a member of this chat room"}, status=403)

            message = ChatMessage.objects.create(
                chat_room=chat_room,
                sender=user,
                message=message_content,
                image=image_file
            )
            
            
            chat_room.updated_at = timezone.now()
            chat_room.save()

            return JsonResponse({
                "success": True,
                "message": _serialize_message(message)
            }, status=201)

        except ChatRoom.DoesNotExist:
            return JsonResponse({"error": "Chat room not found"}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def get_chat_messages_api(request, chat_room_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        try:
            chat_room = ChatRoom.objects.get(id=chat_room_id)

            
            if not _user_in_room(user, chat_room):
                return JsonResponse({"error": "You are not a member of this chat room"}, status=403)

            messages = ChatMessage.objects.filter(chat_room=chat_room).order_by('timestamp')
            return JsonResponse({
                "chat_room_id": chat_room.id,
                "is_group": bool(chat_room.is_group),
                "name": chat_room.name,
                "slug": chat_room.slug,
                "messages": [_serialize_message(m) for m in messages],
            })

        except ChatRoom.DoesNotExist:
            return JsonResponse({"error": "Chat room not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@require_http_methods(["DELETE"])
def api_delete_chat_message(request, message_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        message = ChatMessage.objects.get(id=message_id)
        if message.sender != user:
             return JsonResponse({"error": "You can only delete your own messages"}, status=403)
        
        message.delete()
        return JsonResponse({"success": True, "message": "Message deleted successfully"})
    except ChatMessage.DoesNotExist:
        return JsonResponse({"error": "Message not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def api_update_chat_message(request, message_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        message = ChatMessage.objects.get(id=message_id)
        if message.sender != user:
            return JsonResponse({"error": "You can only edit your own messages"}, status=403)

        message_content = None
        image_file = None
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            message_content = request.POST.get("message")
            if "image" in request.FILES:
                image_file = request.FILES["image"]
        else:
            data = json.loads(request.body or "{}")
            message_content = data.get("message")

        if (message_content is None or str(message_content).strip() == "") and not image_file:
            return JsonResponse({"error": "Message content or image is required"}, status=400)

        if message_content is not None:
            message.message = message_content
        if image_file is not None:
            message.image = image_file

        message.save()

        return JsonResponse({"success": True, "message": _serialize_message(message)})
    except ChatMessage.DoesNotExist:
        return JsonResponse({"error": "Message not found"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def api_bulk_delete_chat_messages(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        data = json.loads(request.body or "{}")
        message_ids = data.get("message_ids", [])
        if not isinstance(message_ids, list):
            return JsonResponse({"error": "message_ids must be a list"}, status=400)

        message_ids = message_ids[:100]
        qs = ChatMessage.objects.filter(id__in=message_ids, sender=user)
        deleted_ids = list(qs.values_list("id", flat=True))
        qs.delete()

        return JsonResponse({"success": True, "deleted_ids": deleted_ids})
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def api_clear_general_chat(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if not getattr(user, "developer", False):
        return JsonResponse({"error": "Developer permission required"}, status=403)

    room = _get_or_create_general_room()
    deleted_count, _ = ChatMessage.objects.filter(chat_room=room).delete()
    return JsonResponse({"success": True, "deleted_count": deleted_count})


@csrf_exempt
@require_http_methods(["DELETE"])
def api_delete_chat_room(request, chat_room_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        chat_room = ChatRoom.objects.get(id=chat_room_id)
        if chat_room.is_group:
            return JsonResponse({"error": "Cannot delete group chat rooms"}, status=403)
        if not _user_in_room(user, chat_room):
            return JsonResponse({"error": "You are not a member of this chat room"}, status=403)

        chat_room.delete()
        return JsonResponse({"success": True, "message": "Chat room deleted successfully"})
    except ChatRoom.DoesNotExist:
        return JsonResponse({"error": "Chat room not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def list_user_chat_rooms_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        try:
            dm_rooms = (
                ChatRoom.objects.filter(is_group=False)
                .filter(Q(user1=user) | Q(user2=user))
                .filter(user1__isnull=False, user2__isnull=False)
            )
            group_rooms = ChatRoom.objects.filter(is_group=True, members=user)
            chat_rooms = (dm_rooms | group_rooms).order_by('-updated_at')

            chat_rooms_data = []
            for room in chat_rooms:
                latest_message = ChatMessage.objects.filter(chat_room=room).order_by('-timestamp').first()

                if room.is_group:
                    chat_rooms_data.append({
                        "chat_room_id": room.id,
                        "type": "group",
                        "name": room.name,
                        "slug": room.slug,
                        "latest_message": latest_message.message if latest_message else None,
                        "latest_message_timestamp": latest_message.timestamp.isoformat() if latest_message else None,
                        "updated_at": room.updated_at.isoformat(),
                    })
                else:
                    other_user = room.user1 if room.user2 == user else room.user2
                    # Safety against legacy/bad data where one side is NULL
                    if other_user is None:
                        continue

                    chat_rooms_data.append({
                        "chat_room_id": room.id,
                        "type": "dm",
                        "other_user_id": other_user.id,
                        "other_user_username": other_user.username,
                        "latest_message": latest_message.message if latest_message else None,
                        "latest_message_timestamp": latest_message.timestamp.isoformat() if latest_message else None,
                        "updated_at": room.updated_at.isoformat(),
                    })

            return JsonResponse({"chat_rooms": chat_rooms_data})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def structure_board_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        boards = StructureBoard.objects.filter(Q(owner=user) | Q(collaborators=user)).distinct()
        data = [{
            "id": b.code,
            "name": b.name,
            "is_owner": b.owner == user
        } for b in boards]
        return JsonResponse({"boards": data})

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            name = data.get("name", "New Board")
            board = StructureBoard.objects.create(owner=user, name=name)
            return JsonResponse({
                "id": board.code,
                "name": board.name,
                "nodes": [],
                "edges": [],
                "is_owner": True
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def structure_board_detail_api(request, board_code):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        board = StructureBoard.objects.get(code=board_code)
    except StructureBoard.DoesNotExist:
        return JsonResponse({"error": "Board not found"}, status=404)

    if board.owner != user and user not in board.collaborators.all():
        return JsonResponse({"error": "Permission denied"}, status=403)

    if request.method == "GET":
        try:
            board_data = json.loads(board.data)
        except:
            board_data = {"nodes": [], "edges": []}
            
        return JsonResponse({
            "id": board.code,
            "name": board.name,
            "nodes": board_data.get("nodes", []),
            "edges": board_data.get("edges", []),
            "is_owner": board.owner == user,
            "collaborators": [u.username for u in board.collaborators.all()]
        })

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            if "name" in data:
                board.name = data["name"]
            
            # Update data if nodes/edges provided
            current_data = json.loads(board.data) if board.data else {"nodes": [], "edges": []}
            if "nodes" in data:
                current_data["nodes"] = data["nodes"]
            if "edges" in data:
                current_data["edges"] = data["edges"]
            
            board.data = json.dumps(current_data)
            board.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        if board.owner != user:
            return JsonResponse({"error": "Only owner can delete"}, status=403)
        board.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def structure_board_join_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            code = data.get("code")
            if not code:
                return JsonResponse({"error": "Code is required"}, status=400)

            try:
                board = StructureBoard.objects.get(code=code)
            except StructureBoard.DoesNotExist:
                return JsonResponse({"error": "Board not found"}, status=404)

            if board.owner == user:
                return JsonResponse({"message": "You are already the owner", "id": board.code})
            
            if user in board.collaborators.all():
                return JsonResponse({"message": "Already joined", "id": board.code})

            board.collaborators.add(user)
            return JsonResponse({"success": True, "id": board.code, "name": board.name})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_save_chat_message(request, message_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        message = ChatMessage.objects.get(id=message_id)
        
        if request.method == "POST":
            # Toggle save status for the user
            if user in message.saved_by.all():
                message.saved_by.remove(user)
                is_saved = False
            else:
                message.saved_by.add(user)
                is_saved = True
            
            # Update is_saved field if this is the message sender
            if message.sender == user:
                message.is_saved = is_saved
                message.save()
            
            saved_by_ids = list(message.saved_by.values_list('id', flat=True))
            
            return JsonResponse({
                "success": True,
                "is_saved": is_saved,
                "saved_by": saved_by_ids,
                "message_id": message.id
            })
        else:
            return JsonResponse({"error": "Method not allowed"}, status=405)
            
    except ChatMessage.DoesNotExist:
        return JsonResponse({"error": "Message not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



# Group Management APIs

@csrf_exempt
def groups_api(request):
    """Main groups API - GET: list user's groups, POST: create new group"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    if request.method == "GET":
        # Get user's groups
        memberships = GroupMembership.objects.filter(user=user).select_related('group')
        groups_data = []
        
        for membership in memberships:
            group = membership.group
            groups_data.append({
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "role": membership.role,
                "invite_code": group.invite_code,
                "is_public": group.is_public,
                "member_count": group.memberships.count(),
                "created_at": group.created_at.isoformat(),
                "is_owner": membership.role == 'owner'
            })
        
        return JsonResponse({"groups": groups_data})
    
    elif request.method == "POST":
        # Create new group
        try:
            data = json.loads(request.body)
            name = data.get("name", "").strip()
            description = data.get("description", "").strip()
            is_public = data.get("is_public", False)
            
            if not name:
                return JsonResponse({"error": "Group name is required"}, status=400)
            
            group = Group.objects.create(
                name=name,
                description=description,
                owner=user,
                is_public=is_public
            )
            
            # Create owner membership
            GroupMembership.objects.create(
                user=user,
                group=group,
                role='owner'
            )
            
            return JsonResponse({
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "role": "owner",
                "invite_code": group.invite_code,
                "is_public": group.is_public,
                "member_count": 1,
                "created_at": group.created_at.isoformat(),
                "is_owner": True
            }, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def group_detail_api(request, group_id):
    """Group detail API - GET: get group details, PUT: update group, DELETE: delete group"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    try:
        group = Group.objects.get(id=group_id)
        membership = GroupMembership.objects.filter(user=user, group=group).first()
        
        if not membership:
            return JsonResponse({"error": "You are not a member of this group"}, status=403)
        
        if request.method == "GET":
            # Get group details with members
            members = []
            for member_rel in group.memberships.select_related('user').order_by('-joined_at'):
                member_user = member_rel.user
                members.append({
                    "id": member_user.id,
                    "username": member_user.username,
                    "name": (member_user.get_full_name() or "").strip() or member_user.username,
                    "role": member_rel.role,
                    "joined_at": member_rel.joined_at.isoformat(),
                    "profile_picture": getattr(member_user, "profile_picture_url", None),
                    "email": member_user.email if membership.role in ['owner', 'admin'] else None,
                })
            
            return JsonResponse({
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "invite_code": group.invite_code,
                "is_public": group.is_public,
                "owner_id": group.owner.id,
                "created_at": group.created_at.isoformat(),
                "updated_at": group.updated_at.isoformat(),
                "members": members,
                "member_count": group.memberships.count(),
                "user_role": membership.role,
                "is_owner": membership.role == 'owner',
                "can_manage": membership.role in ['owner', 'admin']
            })
        
        elif request.method == "PUT":
            # Update group (only owner or admin can update)
            if membership.role not in ['owner', 'admin']:
                return JsonResponse({"error": "Only owners and admins can update group details"}, status=403)
            
            try:
                data = json.loads(request.body)
                
                # Update fields
                if 'name' in data:
                    name = data['name'].strip()
                    if not name:
                        return JsonResponse({"error": "Group name cannot be empty"}, status=400)
                    group.name = name
                
                if 'description' in data:
                    group.description = data['description'].strip()
                
                # Only owner can change public/private setting
                if 'is_public' in data and membership.role == 'owner':
                    group.is_public = bool(data['is_public'])
                
                # Only owner can regenerate invite code
                if data.get('regenerate_invite_code') and membership.role == 'owner':
                    group.invite_code = secrets.token_urlsafe(8)
                
                group.save()
                
                return JsonResponse({
                    "id": group.id,
                    "name": group.name,
                    "description": group.description,
                    "is_public": group.is_public,
                    "invite_code": group.invite_code,
                    "updated_at": group.updated_at.isoformat(),
                    "message": "Group updated successfully"
                })
                
            except Exception as e:
                return JsonResponse({"error": f"Update failed: {str(e)}"}, status=500)
        
        elif request.method == "DELETE":
            # Delete group (only owner can delete)
            if membership.role != 'owner':
                return JsonResponse({"error": "Only group owner can delete the group"}, status=403)
            
            group_name = group.name
            group.delete()
            return JsonResponse({
                "success": True, 
                "message": f"Group '{group_name}' deleted successfully"
            })
    
    except Group.DoesNotExist:
        return JsonResponse({"error": "Group not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def group_join_api(request):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            invite_code = data.get("invite_code", "").strip()
            
            if not invite_code:
                return JsonResponse({"error": "Invite code is required"}, status=400)
            
            try:
                group = Group.objects.get(invite_code=invite_code)
            except Group.DoesNotExist:
                return JsonResponse({"error": "Invalid invite code"}, status=404)
            
            # Check if user is already a member
            if GroupMembership.objects.filter(user=user, group=group).exists():
                return JsonResponse({"error": "You are already a member of this group"}, status=400)
            
            # Create membership
            GroupMembership.objects.create(
                user=user,
                group=group,
                role='member'
            )
            
            return JsonResponse({
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "role": "member",
                "invite_code": group.invite_code,
                "is_public": group.is_public,
                "member_count": group.memberships.count(),
                "created_at": group.created_at.isoformat(),
                "is_owner": False
            })
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def group_leave_api(request, group_id):
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    if request.method == "POST":
        try:
            group = Group.objects.get(id=group_id)
            membership = GroupMembership.objects.filter(user=user, group=group).first()
            
            if not membership:
                return JsonResponse({"error": "You are not a member of this group"}, status=400)
            
            # Owner cannot leave their own group
            if membership.role == 'owner':
                return JsonResponse({"error": "Group owner cannot leave the group. Transfer ownership or delete the group instead."}, status=400)
            
            membership.delete()
            return JsonResponse({"success": True, "message": "Left group successfully"})
            
        except Group.DoesNotExist:
            return JsonResponse({"error": "Group not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)
