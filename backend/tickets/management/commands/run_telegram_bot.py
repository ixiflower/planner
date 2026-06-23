from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tickets.models import Telegram
import json
import urllib.request
import urllib.error
import time
import signal
import sys

User = get_user_model()

class Command(BaseCommand):
    help = 'Run the Telegram bot as a standalone process'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=int, required=True, help='ID of the user who owns the bot')
        parser.add_argument('--poll-interval', type=int, default=1, help='Polling interval in seconds (default: 1)')

    def handle(self, *args, **options):
        user_id = options['user_id']
        poll_interval = options['poll_interval']
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting Telegram bot for user ID {user_id}')
        )
        
        # Get bot configuration
        try:
            telegram_config = Telegram.objects.get(user_id=user_id)
        except Telegram.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'No Telegram configuration found for user ID {user_id}')
            )
            return
        
        if not telegram_config.is_active:
            self.stdout.write(
                self.style.ERROR('Bot is not active')
            )
            return
            
        if not telegram_config.api_token:
            self.stdout.write(
                self.style.ERROR('Bot API token is not set')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Telegram bot started for user {telegram_config.user.username} (@{telegram_config.user.telegram_id})')
        )
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Start polling
        self._poll_updates(telegram_config, poll_interval)

    def _signal_handler(self, signum, frame):
        self.stdout.write(
            self.style.SUCCESS('Received interrupt signal. Shutting down Telegram bot...')
        )
        sys.exit(0)

    def _telegram_request(self, api_token: str, method: str, payload: dict | None = None, timeout: int = 10):
        """
        Make a request to the Telegram Bot API
        """
        url = f"https://api.telegram.org/bot{api_token}/{method}"
        data = None
        headers = {'Content-Type': 'application/json'}
        if payload is not None:
            data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                return json.loads(raw.decode('utf-8'))
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error making Telegram request: {e}")
            )
            return {}

    def _get_dollar_price(self):
        """Get the current dollar price"""
        # Mocked price - in a real implementation, this would fetch from an API
        return "60,000 Tomans"

    def _get_gold_price(self):
        """Get the current gold price"""
        # Mocked price - in a real implementation, this would fetch from an API
        return "4,500,000 Tomans"

    def _process_message(self, telegram_config: Telegram, message: dict):
        """
        Process an incoming message from Telegram
        """
        chat = message.get('chat', {})
        chat_id = chat.get('id')
        text = str(message.get('text', '')).strip()
        from_user = message.get('from', {})
        username = from_user.get('username', 'Unknown')
        
        if not chat_id:
            return
        
        # Log received message
        self.stdout.write(
            self.style.NOTICE(f"Received message from {username}: {text}")
        )
        
        if not text:
            return
        
        # Handle custom commands
        dollar_cmd = (getattr(telegram_config, 'dollar_price_cmd', '/dollar') or '/dollar').strip()
        gold_cmd = (getattr(telegram_config, 'gold_price_cmd', '/gold') or '/gold').strip()
        
        # Check if dollar price sending is enabled and command matches
        if getattr(telegram_config, 'send_dollar_price', False) and text == dollar_cmd:
            price = self._get_dollar_price()
            self._send_message(telegram_config.api_token, chat_id, f"Dollar Price: {price}")
            self.stdout.write(
                self.style.SUCCESS(f"Sent dollar price to {username}")
            )
            return
        
        # Check if gold price sending is enabled and command matches
        if getattr(telegram_config, 'send_gold_price', False) and text == gold_cmd:
            price = self._get_gold_price()
            self._send_message(telegram_config.api_token, chat_id, f"Gold Price: {price}")
            self.stdout.write(
                self.style.SUCCESS(f"Sent gold price to {username}")
            )
            return

    def _send_message(self, api_token: str, chat_id: int, text: str):
        """
        Send a message via the Telegram bot
        """
        payload = {
            'chat_id': chat_id,
            'text': text
        }
        return self._telegram_request(api_token, 'sendMessage', payload)

    def _poll_updates(self, telegram_config: Telegram, poll_interval: int):
        """
        Poll Telegram for updates
        """
        last_update_id = 0
        api_token = telegram_config.api_token
        
        self.stdout.write(
            self.style.SUCCESS("Bot is now polling for updates...")
        )
        
        while True:
            try:
                # Request updates from Telegram
                payload = {
                    'offset': last_update_id + 1,
                    'timeout': 30,
                    'allowed_updates': ['message', 'callback_query']
                }
                
                response = self._telegram_request(api_token, 'getUpdates', payload, timeout=35)
                
                if not response or not response.get('ok'):
                    self.stdout.write(
                        self.style.ERROR(f"Failed to get updates: {response}")
                    )
                    time.sleep(5)
                    continue
                
                updates = response.get('result', [])
                
                for update in updates:
                    update_id = update.get('update_id', 0)
                    if update_id > last_update_id:
                        last_update_id = update_id
                    
                    # Process message
                    if 'message' in update:
                        self._process_message(telegram_config, update['message'])
                
                # Sleep before next poll
                time.sleep(poll_interval)
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error polling Telegram updates: {e}")
                )
                time.sleep(5)