from django.core.management.base import BaseCommand
from authentication.models import User


class Command(BaseCommand):
    help = 'Link a Telegram user ID to an existing user account'

    def add_arguments(self):
        self.add_argument('username', type=str, help='Username of the existing user')
        self.add_argument('telegram_id', type=str, help='Telegram user ID to link')

    def handle(self, *args, **options):
        username = options['username']
        telegram_id = options['telegram_id']
        
        try:
            user = User.objects.get(username=username)
            user.telegram_id = telegram_id
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully linked @{username} to Telegram ID {telegram_id}')
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User @{username} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error linking user: {e}')
            )