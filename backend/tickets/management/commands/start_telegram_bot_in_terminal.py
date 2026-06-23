from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import subprocess
import os
import platform

User = get_user_model()

class Command(BaseCommand):
    help = 'Start the Telegram bot in a new terminal window'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=int, required=True, help='ID of the user who owns the bot')

    def handle(self, *args, **options):
        user_id = options['user_id']
        
        # Get the current working directory (pinger directory)
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        
        # Prepare the command to run the bot
        cmd = [
            'python', 'manage.py', 'run_telegram_bot',
            '--user-id', str(user_id)
        ]
        
        self.stdout.write(
            self.style.SUCCESS(f"Starting Telegram bot for user ID {user_id} in a new terminal...")
        )
        
        # Determine the OS and open terminal accordingly
        system = platform.system()
        try:
            if system == "Windows":
                # Windows - use start command
                subprocess.Popen(['start', 'cmd', '/k'] + cmd, shell=True, cwd=project_dir)
            elif system == "Darwin":
                # macOS - use osascript to open Terminal
                applescript = f'''
                tell app "Terminal"
                    do script "cd '{project_dir}' && {' '.join(cmd)}"
                    activate
                end tell
                '''
                subprocess.Popen(['osascript', '-e', applescript])
            else:
                # Linux - try different terminal emulators
                terminal_commands = [
                    ['gnome-terminal', '--', 'bash', '-c'],
                    ['konsole', '-e', 'bash', '-c'],
                    ['xterm', '-e', 'bash', '-c'],
                    ['terminator', '-x', 'bash', '-c']
                ]
                
                command_executed = False
                for term_cmd in terminal_commands:
                    try:
                        if term_cmd[0] == 'gnome-terminal':
                            full_cmd = f"cd '{project_dir}' && {' '.join(cmd)} && echo 'Telegram Bot is running... Press Ctrl+C to stop.'"
                            subprocess.Popen(term_cmd + [full_cmd], cwd=project_dir)
                        else:
                            full_cmd = f"cd '{project_dir}' && {' '.join(cmd)} ; echo 'Telegram Bot is running... Press Ctrl+C to stop.'"
                            subprocess.Popen(term_cmd + [full_cmd], cwd=project_dir)
                        command_executed = True
                        break
                    except FileNotFoundError:
                        # Terminal emulator not found, try the next one
                        continue
                
                # If none of the terminal emulators worked, fall back to a simple background process
                if not command_executed:
                    subprocess.Popen(cmd, cwd=project_dir)
                    
            self.stdout.write(
                self.style.SUCCESS('Successfully started Telegram bot in a new terminal')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to start Telegram bot in terminal: {e}')
            )