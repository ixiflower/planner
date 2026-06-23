#!/usr/bin/env python3
"""
Simple script to link Telegram account to user
"""
import os
import sys
import django

# Setup Django
sys.path.append('/home/ixi_flower/Documents/planner/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ixiflowerv2ray.settings')
django.setup()

from authentication.models import User

def link_telegram_account(username, telegram_id):
    """Link a Telegram user ID to an existing user account"""
    try:
        user = User.objects.get(username=username)
        user.telegram_id = telegram_id
        user.save()
        print(f"✅ Successfully linked @{username} to Telegram ID {telegram_id}")
        return True
        
    except User.DoesNotExist:
        print(f"❌ User @{username} not found")
        print("Available users:")
        for user in User.objects.all():
            print(f"  - @{user.username} (ID: {user.id})")
        return False
    except Exception as e:
        print(f"❌ Error linking user: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python link_telegram_account.py <username> <telegram_id>")
        print("Example: python link_telegram_account.py savage_ixi 2006833036")
        sys.exit(1)
    
    username = sys.argv[1]
    telegram_id = sys.argv[2]
    
    link_telegram_account(username, telegram_id)