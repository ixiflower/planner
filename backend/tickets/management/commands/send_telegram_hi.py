from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tickets.models import Telegram
import json
import urllib.request
import urllib.error

User = get_user_model()


class Command(BaseCommand):
    help = 'Send "hi" message to Telegram bot users who have started the bot'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Send "hi" to all users with active Telegram bots',
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Send "hi" to a specific user by username',
        )

    def send_telegram_message(self, api_token, chat_id, text):
        """Send a message via Telegram bot API."""
        url = f"https://api.telegram.org/bot{api_token}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': text
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={'Content-Type': 'application/json'}
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                raw = response.read()
                return json.loads(raw.decode('utf-8'))
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            self.stdout.write(
                self.style.ERROR(f"Error contacting Telegram API: {e}")
            )
            return {}

    def resolve_chat_id(self, api_token, user):
        """Resolve chat ID for a user."""
        raw_id = str(getattr(user, 'telegram_id', '') or '').strip()
        if not raw_id:
            return None
        
        # Try to parse as numeric ID
        try:
            return int(raw_id)
        except ValueError:
            pass
        
        # Try to find by username
        username = raw_id.lstrip('@').strip().lower()
        try:
            url = f"https://api.telegram.org/bot{api_token}/getUpdates"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as response:
                raw = response.read()
                updates = json.loads(raw.decode('utf-8'))
        except Exception:
            return None
        
        results = updates.get('result', [])
        for upd in results:
            msg = upd.get('message', {})
            frm = msg.get('from', {})
            chat = msg.get('chat', {})
            frm_username = str(frm.get('username', '')).strip().lower()
            
            if frm_username and frm_username == username:
                cid = chat.get('id')
                try:
                    return int(cid)
                except ValueError:
                    continue
        
        return None

    def send_hi_to_user(self, user):
        """Send 'hi' message to a specific user."""
        try:
            # Get Telegram settings for the user
            telegram = Telegram.objects.get(user=user)
            
            # Check if bot is active and has API token
            if not telegram.is_active:
                self.stdout.write(
                    self.style.WARNING(f"Bot is not active for user {user.username}")
                )
                return False
                
            api_token = telegram.api_token
            if not api_token:
                self.stdout.write(
                    self.style.WARNING(f"No API token for user {user.username}")
                )
                return False
            
            # Resolve chat ID
            chat_id = self.resolve_chat_id(api_token, user)
            if chat_id is None:
                self.stdout.write(
                    self.style.WARNING(f"Cannot resolve chat ID for user {user.username}")
                )
                return False
            
            # Send 'hi' message
            response = self.send_telegram_message(api_token, chat_id, "hi")
            if response.get('ok'):
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully sent 'hi' to {user.username}")
                )
                return True
            else:
                self.stdout.write(
                    self.style.ERROR(f"Failed to send 'hi' to {user.username}: {response}")
                )
                return False
                
        except Telegram.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(f"No Telegram settings for user {user.username}")
            )
            return False
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error sending message to {user.username}: {e}")
            )
            return False

    def handle(self, *args, **options):
        if options['all']:
            # Get all users with active Telegram bots
            telegram_users = Telegram.objects.filter(is_active=True).select_related('user')
            
            if not telegram_users:
                self.stdout.write(
                    self.style.WARNING("No active Telegram bots found")
                )
                return
            
            success_count = 0
            total_count = telegram_users.count()
            
            self.stdout.write(
                f"Sending 'hi' to {total_count} users..."
            )
            
            for telegram in telegram_users:
                user = telegram.user
                self.stdout.write(f"Processing user: {user.username}")
                
                if self.send_hi_to_user(user):
                    success_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Completed! Sent 'hi' to {success_count}/{total_count} users."
                )
            )
            
        elif options['user']:
            username = options['user']
            try:
                user = User.objects.get(username=username)
                if self.send_hi_to_user(user):
                    self.stdout.write(
                        self.style.SUCCESS(f"Successfully sent 'hi' to {username}")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"Failed to send 'hi' to {username}")
                    )
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"User {username} not found")
                )
        else:
            self.stdout.write(
                self.style.ERROR("Please specify either --all or --user <username>")
            )