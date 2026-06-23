import os
import sys
import django
import logging


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)


logger = logging.getLogger(__name__)

sys.path.append('/home/ixi_flower/Documents/planner/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ixiflowerv2ray.settings')
django.setup()

import telebot
import requests
from tickets.models import Telegram, Report, AssignedTask
from authentication.models import User

logger.info("🔧 Planner Bot Starting Up...")
logger.info("✅ Django setup completed")


def get_bot_token():
    """
    Get Telegram bot token from database
    """
    try:
        telegram_bot = Telegram.objects.filter(is_active=True).first()
        if telegram_bot and telegram_bot.api_token:
            return telegram_bot.api_token
        else:
            print("No active Telegram bot found in database")
            return None
    except Exception as e:
        print(f"Error getting bot token: {e}")
        return None


API_TOKEN = get_bot_token()
if not API_TOKEN:
    print("ERROR: Could not get bot token from database. Bot will not start.")
    exit(1)

bot = telebot.TeleBot(API_TOKEN)

def get_usd_to_irr():
    """
    Get USD to IRR exchange rate from Alan chand website
    """
    url = "https://alanchand.com/en/currencies-price/usd"

    try:
        logger.info(f"🌐 Fetching USD rate from: {url}")
        response = requests.get(url, timeout=10)
        logger.info(f"📡 Response status: {response.status_code}")
        logger.info(f"📄 Response content length: {len(response.text)}")
        
        # Log first 500 characters for debugging
        logger.info(f"🔍 HTML Preview: {response.text[:500]}...")
        
        import re
        
        # Multiple patterns to try for different website structures
        patterns = [
            r'(\d{1,3}(?:,\d{3})*)\s+Iranian\s+Rials',
            r'(\d{1,3}(?:,\d{3})*\.?\d*)\s+Iranian\s+Rials',
            r'(\d{1,3}(?:,\d{3})*)\s+Rials',
            r'(\d{1,3}(?:,\d{3})*\.?\d*)\s+Rials',
            r'Toman\s*:?\s*(\d{1,3}(?:,\d{3})*\.?\d*)',
            r'(\d{1,3}(?:,\d{3})*\.?\d*)\s*Toman'
        ]
        
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, response.text, re.IGNORECASE)
            if match:
                logger.info(f"✅ Pattern {i+1} matched: {pattern}")
                price_str = match.group(1).replace(',', '')
                try:
                    price = float(price_str)
                    logger.info(f"💰 Parsed price: {price:,.2f}")
                    
                    # If it looks like Toman (smaller number), convert to Rials
                    if price < 1000000:  # Likely Toman, convert to Rials
                        price *= 10
                        logger.info(f"🔄 Converted from Toman to Rials: {price:,.2f}")
                    
                    return price
                except ValueError as e:
                    logger.error(f"❌ Error parsing price: {e}")
                    continue
        
        logger.warning("⚠️ No matching pattern found in response")
        
        # Fallback: try to extract any large number that looks like a price
        fallback_pattern = r'(\d{4,}(?:,\d{3})*\.?\d*)'
        fallback_match = re.search(fallback_pattern, response.text)
        if fallback_match:
            price_str = fallback_match.group(1).replace(',', '')
            try:
                price = float(price_str)
                logger.info(f"🔄 Fallback extracted price: {price:,.2f}")
                return price
            except ValueError:
                pass
        
        return None

    except requests.exceptions.RequestException as e:
        logger.error(f"🌐 Network error: {e}")
        return None
    except Exception as e:
        logger.error(f"💥 General error: {e}")
        return None

def is_dollar_feature_enabled():
    """
    Check if any user has the dollar price feature enabled
    """
    try:
        
        return Telegram.objects.filter(send_dollar_price=True).exists()
    except Exception as e:
        print(f"Error checking dollar feature: {e}")
        return False

def get_gold_to_irr():
    """
    Get 18K Gold price from Alan chand website (in Toman, convert to Rials)
    """
    url = "https://alanchand.com/gold-price/18ayar"

    try:
        response = requests.get(url, timeout=10)
        
        
        import re
        
        persian_pattern = r'([۰-۹,]+)\s*تومان'
        match = re.search(persian_pattern, response.text)
        
        if match:
            
            persian_numbers = {
                '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
                '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
            }
            
            persian_price = match.group(1)
            
            for persian, arabic in persian_numbers.items():
                persian_price = persian_price.replace(persian, arabic)
            
            
            price_str = persian_price.replace(',', '')
            toman_price = float(price_str)
            
            
            return toman_price * 10
        
        return None

    except Exception as e:
        print("Error:", e)
        return None

def is_gold_feature_enabled():
    """
    Check if any user has the gold price feature enabled
    """
    try:
        
        return Telegram.objects.filter(send_gold_price=True).exists()
    except Exception as e:
        print(f"Error checking gold feature: {e}")
        return False

def is_reports_feature_enabled():
    """
    Check if any user has the reports feature enabled
    """
    try:
        return Telegram.objects.filter(send_reports=True).exists()
    except Exception as e:
        print(f"Error checking reports feature: {e}")
        return False

def is_tasks_feature_enabled():
    """
    Check if any user has the tasks feature enabled
    """
    try:
        return Telegram.objects.filter(send_tasks=True).exists()
    except Exception as e:
        print(f"Error checking tasks feature: {e}")
        return False



def is_team_feature_enabled():
    """
    Check if any user has the team feature enabled
    """
    try:
        return Telegram.objects.filter(send_team=True).exists()
    except Exception as e:
        print(f"Error checking team feature: {e}")
        return False

def get_available_commands():
    """
    Get list of available commands based on active bot settings
    """
    try:
        
        telegram_bot = Telegram.objects.filter(is_active=True).first()
        if not telegram_bot:
            return []
        
        available_commands = []
        
        
        available_commands.append({
            'command': '/start',
            'description': 'Start the bot and get welcome message',
            'emoji': '🚀'
        })
        available_commands.append({
            'command': '/help',
            'description': 'Show this help message',
            'emoji': '❓'
        })
        
        
        if telegram_bot.send_team:
            available_commands.append({
                'command': '/team',
                'description': 'Show team members and their roles',
                'emoji': '👥'
            })
        
        if telegram_bot.send_tasks:
            available_commands.append({
                'command': '/tasks',
                'description': 'Show your assigned tasks',
                'emoji': '✅'
            })
        
        if telegram_bot.send_reports:
            available_commands.append({
                'command': '/reports',
                'description': 'Show your recent reports',
                'emoji': '📊'
            })
        

        
        if telegram_bot.send_dollar_price:
            dollar_cmd = telegram_bot.dollar_price_cmd or '/dollar'
            available_commands.append({
                'command': dollar_cmd,
                'description': 'Get USD to IRR exchange rate',
                'emoji': '💰'
            })
        else:
            # Temporarily add dollar command for testing even if disabled in database
            available_commands.append({
                'command': '/dollar',
                'description': 'Get USD to IRR exchange rate (Testing)',
                'emoji': '💰'
            })
        
        if telegram_bot.send_gold_price:
            gold_cmd = telegram_bot.gold_price_cmd or '/gold'
            available_commands.append({
                'command': gold_cmd,
                'description': 'Get 18K Gold price in IRR',
                'emoji': '🥇'
            })
        
        
        available_commands.append({
            'command': 'hi',
            'description': 'Say hello to the bot',
            'emoji': '👋'
        })
        
        return available_commands
        
    except Exception as e:
        logger.error(f"Error getting available commands: {e}")
        return []

def get_user_reports(telegram_user_id):
    """
    Get all reports from all users using API (shows user names)
    """
    try:
        
        user = User.objects.filter(telegram_id=str(telegram_user_id)).first()
        if not user:
            user = User.objects.filter(id=telegram_user_id).first()
        
        if not user:
            logger.warning(f"⚠️ User not found for telegram_id: {telegram_user_id}")
            return "📊 User not found. Please contact admin to link your Telegram account."
        
        logger.info(f"🔍 Looking up reports for user: {user.username} (ID: {user.id})")
        
        
        from tickets.models import Token
        auth_user = User.objects.filter(email='amirabbas.rouintan2007@gmail.com').first()
        if not auth_user:
            logger.error("❌ Authentication user not found: amirabbas.rouintan2007@gmail.com")
            return "❌ Authentication user not found."
        
        if not hasattr(auth_user, 'auth_token') or not auth_user.auth_token:
            logger.error("❌ Authentication token not found for user: %s", auth_user.username)
            return "❌ Authentication token not found."
        
        token = auth_user.auth_token
        headers = {'Authorization': f'Token {token.key}'}
        logger.info(f"🔐 Using authentication for user: {auth_user.username}")
        
        
        backend_url = os.getenv('BACKEND_URL', '165.22.115.250:8000')
        response = requests.get(f"{backend_url}/tickets/api/submissions/all/", headers=headers, timeout=10)
        logger.info(f"📡 Submissions API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                submissions_data = response.json()
                
                if 'reports' in submissions_data and submissions_data['reports']:
                    
                    # Get all reports (not just current user's reports)
                    user_reports = submissions_data['reports']
                    logger.info(f"📊 Found {len(user_reports)} total reports")
                    
                    if user_reports:
                        # Create structured data for inline buttons
                        reports_data = []
                        for report in user_reports[:10]:  
                            status = report.get('status', 'unknown')
                            submitted_at = report.get('submittedAt', '')
                            note = report.get('note', '')
                            rating = report.get('rating')
                            tasks = report.get('tasks', [])
                            
                            # Try different field names for user name
                            user_name = (
                                report.get('userName') or 
                                report.get('username') or 
                                report.get('user_name') or 
                                report.get('name') or
                                f"User {report.get('userId', 'Unknown')}"
                            )
                            
                            # Create button text with report details - user name on left
                            button_text = f"{user_name} | 📝 {submitted_at[:10]} | {status}"
                            if rating:
                                rating_5_scale = round(rating / 2)
                                button_text += f" | ⭐{rating_5_scale}/5"
                            if tasks:
                                completed_tasks = [t for t in tasks if t.get('done', False)]
                                button_text += f" | {len(completed_tasks)}/{len(tasks)} tasks"
                            
                            # Create callback data
                            callback_data = f"report_{report.get('id', 'unknown')}"
                            
                            reports_data.append({
                                'button_text': button_text,
                                'callback_data': callback_data,
                                'status': status,
                                'submitted_at': submitted_at,
                                'note': note,
                                'rating': rating,
                                'tasks': tasks,
                                'user_name': user_name  # Include user name in data
                            })
                        
                        logger.info("✅ Reports data retrieved successfully")
                        return reports_data
                    else:
                        logger.info(f"ℹ️ No reports found")
                        return "📊 No reports found."
                else:
                    logger.info("ℹ️ No reports found in API response")
                    return "📊 No reports found."
                    
            except ValueError as e:
                logger.error(f"❌ Error parsing reports data: {e}")
                return "❌ Error parsing reports data."
        else:
            logger.error(f"❌ Submissions API returned status code: {response.status_code}")
            return f"❌ Error fetching reports. Status: {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        logger.error(f"🌐 API request error: {e}")
        return "❌ Error connecting to reports API. Please try again later."
    except Exception as e:
        logger.error(f"💥 Error getting user reports: {e}")
        return "❌ Error fetching reports."

def get_user_tasks(telegram_user_id):
    """
    Get all assigned tasks for a user by Telegram user ID using API
    """
    try:
        
        user = User.objects.filter(telegram_id=str(telegram_user_id)).first()
        if not user:
            user = User.objects.filter(id=telegram_user_id).first()
        
        if not user:
            logger.warning(f"⚠️ User not found for telegram_id: {telegram_user_id}")
            return "✅ User not found. Please contact admin to link your Telegram account."
        
        logger.info(f"🔍 Looking up tasks for user: {user.username} (ID: {user.id})")
        
        
        from tickets.models import Token
        auth_user = User.objects.filter(email='amirabbas.rouintan2007@gmail.com').first()
        if not auth_user:
            logger.error("❌ Authentication user not found: amirabbas.rouintan2007@gmail.com")
            return "❌ Authentication user not found."
        
        if not hasattr(auth_user, 'auth_token') or not auth_user.auth_token:
            logger.error("❌ Authentication token not found for user: %s", auth_user.username)
            return "❌ Authentication token not found."
        
        token = auth_user.auth_token
        headers = {'Authorization': f'Token {token.key}'}
        logger.info(f"🔐 Using authentication for user: {auth_user.username}")
        
        
        backend_url = os.getenv('BACKEND_URL', '165.22.115.250:8000')
        response = requests.get(f"{backend_url}/tickets/api/assigned-tasks/", headers=headers, timeout=10)
        logger.info(f"📡 Tasks API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                tasks_data = response.json()
                
                if 'assigned_tasks' in tasks_data and tasks_data['assigned_tasks']:
                    user_tasks = [task for task in tasks_data['assigned_tasks'] if task.get('user_id') == user.id]
                    logger.info(f"📋 Found {len(user_tasks)} tasks for user {user.username}")
                    
                    if user_tasks:
                        response_text = "✅ Your Assigned Tasks:\n\n"
                        
                        for task in user_tasks:
                            status = "✅ Done" if task.get('done', False) else "❌ Pending"
                            title = task.get('title', 'Assigned Task')
                            text = task.get('text', '')
                            date = task.get('date', '')
                            assigned_by = task.get('assigned_by_username', 'Unknown')
                            
                            response_text += f"📋 {title}\n"
                            response_text += f"   Text: {text}\n"
                            response_text += f"   Status: {status}\n"
                            response_text += f"   Date: {date}\n"
                            response_text += f"   Assigned by: {assigned_by}\n"
                            response_text += "\n"
                        
                        logger.info("✅ Tasks data retrieved successfully")
                        return response_text
                    else:
                        logger.info(f"ℹ️ No tasks found for user {user.username}")
                        return "✅ No assigned tasks found."
                else:
                    logger.info("ℹ️ No assigned tasks found in API response")
                    return "✅ No assigned tasks found."
                    
            except ValueError as e:
                logger.error(f"❌ Error parsing tasks data: {e}")
                return "❌ Error parsing tasks data."
        else:
            logger.error(f"❌ Tasks API returned status code: {response.status_code}")
            return f"❌ Error fetching tasks. Status: {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        logger.error(f"🌐 API request error: {e}")
        return "❌ Error connecting to tasks API. Please try again later."
    except Exception as e:
        logger.error(f"💥 Error getting user tasks: {e}")
        return "❌ Error fetching tasks."

def get_user_team():
    """
    Get all team members from API with authentication
    """
    try:
        
        from tickets.models import Token
        auth_user = User.objects.filter(email='amirabbas.rouintan2007@gmail.com').first()
        if not auth_user or not hasattr(auth_user, 'auth_token'):
            logger.error("❌ Authentication token not found for ixi_flower user")
            return "❌ Authentication token not found."
        
        token = auth_user.auth_token
        headers = {'Authorization': f'Token {token.key}'}
        logger.info(f"🔐 Using authentication token for user: {auth_user.username}")
        
        backend_url = os.getenv('BACKEND_URL', '165.22.115.250:8000')
        response = requests.get(f"{backend_url}/api/team/", headers=headers, timeout=10)
        logger.info(f"📡 Team API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                team_data = response.json()
                if 'users' in team_data and team_data['users']:
                    users = team_data['users']
                    
                    # Filter out users with 'None' role
                    filtered_users = [user for user in users if user.get('role', 'None') != 'None']
                    
                    logger.info(f"👥 Found {len(users)} total members, {len(filtered_users)} after filtering None roles")
                    
                    
                    response_text = "👥 Team Members:\n\n"
                    
                    for user in filtered_users:
                        name = user.get('name', 'Unknown')
                        role = user.get('role', 'None')
                        
                        
                        role_emoji = {
                            'Leader': '👑',
                            'Mod': '⚡', 
                            'Member': '👤',
                            'None': '🚫'
                        }.get(role, '👤')
                        
                        response_text += f"{role_emoji} {name} - {role}\n"
                    
                    response_text += f"\n📊 Total: {len(filtered_users)} active members"
                    
                    
                    markup = telebot.types.InlineKeyboardMarkup()
                    
                    for user in filtered_users:
                        name = user.get('name', 'Unknown')
                        role = user.get('role', 'None')
                        button_text = f"{name} - {role}"
                        callback_data = f"user_{user.get('id', 0)}"
                        markup.add(telebot.types.InlineKeyboardButton(button_text, callback_data=callback_data))
                    
                    logger.info("✅ Team data retrieved successfully")
                    return response_text, markup
                else:
                    logger.warning("⚠️ No team members found in response")
                    return "👥 No team members found."
                    
            except ValueError as e:
                logger.error(f"❌ Error parsing team data: {e}")
                return "❌ Error parsing team data."
        else:
            logger.error(f"❌ API returned status code: {response.status_code}")
            return f"❌ Error fetching team members. Status: {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        logger.error(f"🌐 API request error: {e}")
        return "❌ Error connecting to team API. Please try again later."
    except Exception as e:
        logger.error(f"💥 Error getting team members: {e}")
        return "❌ Error fetching team members."

def parse_team_from_text(text):
    """
    Parse team members from text response using regex
    """
    try:
        
        patterns = [
            r'([A-Za-z0-9_]+)\s*[-:]\s*(Leader|Mod|Member)',  
            r'(Leader|Mod|Member)\s*[-:]\s*([A-Za-z0-9_]+)',  
            r'"username":\s*"([^"]+)",?\s*"team_role":\s*"([^"]+)"',  
            r'<[^>]*>?\s*([A-Za-z0-9_]+)\s*[-:]\s*(Leader|Mod|Member)\s*<[^>]*>?',  
        ]
        
        team_members = []
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match) == 2:
                    username, role = match
                    team_members.append({'username': username.strip(), 'team_role': role.strip()})
        
        if team_members:
            
            seen = set()
            unique_members = []
            for member in team_members:
                key = (member['username'], member['team_role'])
                if key not in seen:
                    seen.add(key)
                    unique_members.append(member)
            
            
            markup = telebot.types.InlineKeyboardMarkup()
            
            for member in unique_members:
                username = member['username']
                role = member['team_role']
                button_text = f"{username} - {role}"
                callback_data = f"user_{hash(username) % 10000}"  
                markup.add(telebot.types.InlineKeyboardButton(button_text, callback_data=callback_data))
            
            if markup.keyboard:
                return "👥 **Team Members:**", markup
        
        return "👥 No team members found in response."
        
    except Exception as e:
        print(f"Error parsing team from text: {e}")
        return f"❌ Error parsing team data: {str(e)}"



@bot.message_handler(commands=['start'])
def send_welcome(message):
    logger.info(f"🚀 Received /start command from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    
    try:
        bot.delete_message(message.chat.id, message.message_id)
    except:
        pass  
    
    
    markup = telebot.types.InlineKeyboardMarkup()
    help_button = telebot.types.InlineKeyboardButton(
        text="❓ Do you need any help?",
        callback_data="show_help"
    )
    markup.add(help_button)
    
    bot.send_message(
        message.chat.id, 
        "Hello! Welcome to the planner bot. Say 'hi' to get started!",
        reply_markup=markup
    )
    logger.info("✅ /start command handled")

@bot.message_handler(commands=['dollar'])
def send_dollar_price(message):
    logger.info(f"💰 Received /dollar command from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    # Check if feature is enabled
    feature_enabled = is_dollar_feature_enabled()
    logger.info(f"🔍 Dollar feature enabled: {feature_enabled}")
    
    # For debugging, let's also check the database settings
    try:
        telegram_bot = Telegram.objects.filter(is_active=True).first()
        if telegram_bot:
            logger.info(f"🤖 Active bot found - send_dollar_price: {telegram_bot.send_dollar_price}")
        else:
            logger.warning("⚠️ No active bot found in database")
    except Exception as e:
        logger.error(f"❌ Error checking bot settings: {e}")
    
    if feature_enabled:
        logger.info("💲 Dollar feature is enabled, fetching rate...")
        rate = get_usd_to_irr()
        if rate:
            
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except:
                pass  
            
            # Create inline keyboard with help button
            markup = telebot.types.InlineKeyboardMarkup()
            help_button = telebot.types.InlineKeyboardButton(
                text="❓ Help",
                callback_data="show_help"
            )
            markup.add(help_button)
            
            bot.send_message(message.chat.id, f"💲 1 USD = {rate:,.2f} IRR", reply_markup=markup)
            logger.info(f"✅ Sent dollar rate: {rate:,.2f} IRR")
        else:
            # Create inline keyboard with help button for error message
            markup = telebot.types.InlineKeyboardMarkup()
            help_button = telebot.types.InlineKeyboardButton(
                text="❓ Help",
                callback_data="show_help"
            )
            markup.add(help_button)
            
            bot.send_message(message.chat.id, "❌ Sorry, could not fetch the exchange rate at the moment. Please try again later.", reply_markup=markup)
            logger.warning("⚠️ Failed to fetch dollar rate")
    else:
        bot.send_message(message.chat.id, "Sorry, the dollar price feature is not available.")
        logger.info("ℹ️ Dollar feature is disabled")

@bot.message_handler(commands=['gold'])
def send_gold_price(message):
    logger.info(f"🥇 Received /gold command from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    if is_gold_feature_enabled():
        logger.info("🥇 Gold feature is enabled, fetching price...")
        price = get_gold_to_irr()
        if price:
            
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except:
                pass  
            
            # Create inline keyboard with help button
            markup = telebot.types.InlineKeyboardMarkup()
            help_button = telebot.types.InlineKeyboardButton(
                text="❓ Help",
                callback_data="show_help"
            )
            markup.add(help_button)
            
            bot.send_message(message.chat.id, f"🥇 18K Gold = {price:,.0f} IRR", reply_markup=markup)
            logger.info(f"✅ Sent gold price: {price:,.0f} IRR")
        else:
            # Create inline keyboard with help button for error message
            markup = telebot.types.InlineKeyboardMarkup()
            help_button = telebot.types.InlineKeyboardButton(
                text="❓ Help",
                callback_data="show_help"
            )
            markup.add(help_button)
            
            bot.send_message(message.chat.id, "Sorry, could not fetch the gold price at the moment.", reply_markup=markup)
            logger.warning("⚠️ Failed to fetch gold price")
    else:
        bot.send_message(message.chat.id, "Sorry, the gold price feature is not available.")
        logger.info("ℹ️ Gold feature is disabled")

@bot.message_handler(commands=['reports'])
def send_reports(message):
    logger.info(f"📊 Received /reports command from user: {message.from_user.username} (ID: {message.from_user.id})")
    if is_reports_feature_enabled():
        try:
            telegram_user_id = message.from_user.id
            logger.info(f"🔍 Fetching reports for telegram_user_id: {telegram_user_id}")
            reports_data = get_user_reports(telegram_user_id)
            
            
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except:
                pass  
            
            # Check if we have structured data (list) or text data
            if isinstance(reports_data, list):
                # Create inline keyboard with report buttons and help button
                markup = telebot.types.InlineKeyboardMarkup()
                
                for report in reports_data:
                    button_text = report['button_text']
                    callback_data = report['callback_data']
                    markup.add(telebot.types.InlineKeyboardButton(
                        text=button_text,
                        callback_data=callback_data
                    ))
                
                # Add help button at the end
                help_button = telebot.types.InlineKeyboardButton(
                    text="❓ Help",
                    callback_data="show_help"
                )
                markup.add(help_button)
                
                # Send intro message with inline buttons
                intro_text = "📊 **All Reports:**\n\nClick on any report to view details:"
                bot.send_message(message.chat.id, intro_text, reply_markup=markup, parse_mode='Markdown')
                logger.info("✅ Reports sent with inline buttons")
                
            else:
                # Fallback to old text format
                # Create inline keyboard with help button
                markup = telebot.types.InlineKeyboardMarkup()
                help_button = telebot.types.InlineKeyboardButton(
                    text="❓ Help",
                    callback_data="show_help"
                )
                markup.add(help_button)
                
                bot.send_message(message.chat.id, reports_data, reply_markup=markup)
                logger.info("✅ Reports sent as text with help button")
                
        except Exception as e:
            logger.error(f"❌ Error in send_reports: {e}")
            bot.send_message(message.chat.id, "❌ Error fetching reports. Please try again later.")
    else:
        bot.send_message(message.chat.id, "Sorry, the reports feature is not available.")
        logger.info("ℹ️ Reports feature is disabled")

@bot.message_handler(commands=['tasks'])
def send_tasks(message):
    logger.info(f"✅ Received /tasks command from user: {message.from_user.username} (ID: {message.from_user.id})")
    if is_tasks_feature_enabled():
        try:
            telegram_user_id = message.from_user.id
            logger.info(f"🔍 Fetching tasks for telegram_user_id: {telegram_user_id}")
            tasks_data = get_user_tasks(telegram_user_id)
            
            
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except:
                pass  
            
            # Create inline keyboard with help button
            markup = telebot.types.InlineKeyboardMarkup()
            help_button = telebot.types.InlineKeyboardButton(
                text="❓ Help",
                callback_data="show_help"
            )
            markup.add(help_button)
            
            bot.send_message(message.chat.id, tasks_data, reply_markup=markup)
            logger.info("✅ Tasks sent successfully")
        except Exception as e:
            logger.error(f"❌ Error in send_tasks: {e}")
            bot.send_message(message.chat.id, "❌ Error fetching tasks. Please try again later.")
    else:
        bot.send_message(message.chat.id, "Sorry, the tasks feature is not available.")
        logger.info("ℹ️ Tasks feature is disabled")



@bot.message_handler(commands=['team'])
def send_team(message):
    logger.info(f"👥 Received /team command from user: {message.from_user.username} (ID: {message.from_user.id})")
    if is_team_feature_enabled():
        try:
            logger.info("🔍 Fetching team data...")
            team_data = get_user_team()
            
            
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except:
                pass  
            
            # Create inline keyboard with help button
            help_markup = telebot.types.InlineKeyboardMarkup()
            help_button = telebot.types.InlineKeyboardButton(
                text="❓ Help",
                callback_data="show_help"
            )
            help_markup.add(help_button)
            
            if isinstance(team_data, tuple):
                text, markup = team_data
                # Add help button to existing markup
                if hasattr(markup, 'keyboard') and markup.keyboard:
                    # Add help button to the first row or create new row
                    if len(markup.keyboard) > 0:
                        # Add help button to the first row
                        markup.keyboard[0].append(help_button)
                    else:
                        markup.add(help_button)
                else:
                    # Use our help markup if original has no keyboard
                    markup = help_markup
                
                bot.send_message(message.chat.id, text, reply_markup=markup)
                logger.info("✅ Team data sent with updated markup")
            else:
                bot.send_message(message.chat.id, team_data, reply_markup=help_markup)
                logger.info("✅ Team data sent with help button")
                
        except Exception as e:
            logger.error(f"❌ Error in send_team: {e}")
            bot.send_message(message.chat.id, "❌ Error fetching team members. Please try again later.")
    else:
        bot.send_message(message.chat.id, "Sorry, the team feature is not available.")
        logger.info("ℹ️ Team feature is disabled")

@bot.message_handler(func=lambda message: message.text.lower() == 'hi')
def respond_to_hi(message):
    logger.info(f"👋 Received 'hi' message from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    
    try:
        bot.delete_message(message.chat.id, message.message_id)
    except:
        pass  
    
    bot.send_message(message.chat.id, "welcome")
    logger.info("✅ Responded to 'hi'")

@bot.message_handler(func=lambda message: message.text.lower() in ['hello', 'hey', 'hi there', 'greetings'])
def respond_to_greetings(message):
    logger.info(f"👋 Received greeting from user: {message.from_user.username} (ID: {message.from_user.id}) - Text: '{message.text}'")
    
    
    try:
        bot.delete_message(message.chat.id, message.message_id)
    except:
        pass  
    
    bot.send_message(message.chat.id, "welcome ok")
    logger.info("✅ Responded to greeting")

@bot.message_handler(commands=['debug_dollar'])
def debug_dollar_price(message):
    """Debug command to test dollar price functionality regardless of database settings"""
    logger.info(f"🔧 Received debug_dollar command from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    try:
        bot.delete_message(message.chat.id, message.message_id)
    except:
        pass  
    
    logger.info("🔧 Debug mode: Testing dollar price fetch...")
    rate = get_usd_to_irr()
    
    if rate:
        bot.send_message(message.chat.id, f"🔧 Debug: 1 USD = {rate:,.2f} IRR")
        logger.info(f"✅ Debug dollar rate: {rate:,.2f} IRR")
    else:
        bot.send_message(message.chat.id, "🔧 Debug: Failed to fetch dollar rate. Check logs for details.")
        logger.warning("⚠️ Debug dollar rate fetch failed")

@bot.message_handler(commands=['debug_features'])
def debug_features(message):
    """Debug command to check which features are enabled"""
    logger.info(f"🔧 Received debug_features command from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    try:
        bot.delete_message(message.chat.id, message.message_id)
    except:
        pass  
    
    try:
        telegram_bot = Telegram.objects.filter(is_active=True).first()
        if telegram_bot:
            debug_text = "🔧 **Feature Status:**\n\n"
            debug_text += f"💰 Dollar Price: {'✅ Enabled' if telegram_bot.send_dollar_price else '❌ Disabled'}\n"
            debug_text += f"🥇 Gold Price: {'✅ Enabled' if telegram_bot.send_gold_price else '❌ Disabled'}\n"
            debug_text += f"📋 Tasks: {'✅ Enabled' if telegram_bot.send_tasks else '❌ Disabled'}\n"
            debug_text += f"📊 Reports: {'✅ Enabled' if telegram_bot.send_reports else '❌ Disabled'}\n"
            debug_text += f"👥 Team: {'✅ Enabled' if telegram_bot.send_team else '❌ Disabled'}\n"
            
            if telegram_bot.send_dollar_price:
                debug_text += f"\n💰 Dollar Command: {telegram_bot.dollar_price_cmd or '/dollar'}\n"
            if telegram_bot.send_gold_price:
                debug_text += f"🥇 Gold Command: {telegram_bot.gold_price_cmd or '/gold'}\n"
            
            bot.send_message(message.chat.id, debug_text, parse_mode='Markdown')
            logger.info("✅ Feature status sent")
        else:
            bot.send_message(message.chat.id, "🔧 No active bot found in database")
            logger.warning("⚠️ No active bot found for debug_features")
    except Exception as e:
        logger.error(f"❌ Error in debug_features: {e}")
        bot.send_message(message.chat.id, "🔧 Error checking features. Check logs for details.")

@bot.message_handler(commands=['help'])
def send_help(message):
    logger.info(f"❓ Received /help command from user: {message.from_user.username} (ID: {message.from_user.id})")
    
    try:
        available_commands = get_available_commands()
        
        if available_commands:
            
            markup = telebot.types.InlineKeyboardMarkup()
            
            for cmd in available_commands:
                if cmd['command'] not in ['/start', '/help']:  
                    button_text = f"{cmd['emoji']} {cmd['command']}"
                    callback_data = f"cmd_{cmd['command'].replace('/', '')}"
                    markup.add(telebot.types.InlineKeyboardButton(button_text, callback_data=callback_data))
            
            help_text = "🤖 **Available Commands:**\n\n"
            help_text += "Select a command below to get started!"
            
            
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except:
                pass  
            
            
            # Send help image with text as caption
            help_image_path = "/home/ixi_flower/Documents/planner/backend/media/profile_pictures/windy-eye.gif"
            try:
                with open(help_image_path, 'rb') as photo:
                    bot.send_photo(
                        message.chat.id, 
                        photo, 
                        caption=help_text, 
                        reply_markup=markup,
                        parse_mode='Markdown'
                    )
                logger.info("✅ Help message sent with image and inline keyboard")
            except FileNotFoundError:
                # Fallback to text-only if image not found
                bot.send_message(message.chat.id, help_text, reply_markup=markup)
                logger.warning("⚠️ Help image not found, sent text-only help")
        else:
            bot.send_message(message.chat.id, "❌ No commands available. Please contact the administrator.")
            logger.warning("⚠️ No commands available for this bot")
            
    except Exception as e:
        logger.error(f"❌ Error in send_help: {e}")
        bot.send_message(message.chat.id, "❌ Error fetching help. Please try again later.")

@bot.callback_query_handler(func=lambda call: True)
def handle_callback_query(call):
    """Handle inline keyboard button clicks"""
    try:
        
        if call.data == "show_help":
            # Handle help button click
            bot.delete_message(call.message.chat.id, call.message.message_id)
            
            # Create fake message for help function
            fake_message = type('Message', (), {
                'chat': call.message.chat,
                'from_user': call.from_user,
                'message_id': call.message.message_id
            })()
            
            # Show help
            send_help(fake_message)
            
        elif call.data.startswith('report_'):
            # Handle report detail click
            report_id = call.data.replace('report_', '')
            bot.delete_message(call.message.chat.id, call.message.message_id)
            
            # Get user reports again to find the specific report
            reports_data = get_user_reports(call.from_user.id)
            
            if isinstance(reports_data, list):
                # Find the specific report
                selected_report = None
                for report in reports_data:
                    if report['callback_data'] == call.data:
                        selected_report = report
                        break
                
                if selected_report:
                    # Create detailed report view
                    detail_text = "📊 **Report Details:**\n\n"
                    detail_text += f"👤 **User:** {selected_report['user_name']}\n"
                    detail_text += f"📅 **Date:** {selected_report['submitted_at']}\n"
                    detail_text += f"📊 **Status:** {selected_report['status']}\n"
                    
                    if selected_report['rating']:
                        rating_5_scale = round(selected_report['rating'] / 2)
                        detail_text += f"⭐ **Rating:** {rating_5_scale}/5\n"
                    
                    if selected_report['note']:
                        detail_text += f"📝 **Note:**\n{selected_report['note']}\n"
                    
                    if selected_report['tasks']:
                        completed_tasks = [t for t in selected_report['tasks'] if t.get('done', False)]
                        detail_text += f"✅ **Tasks:** {len(completed_tasks)}/{len(selected_report['tasks'])} completed\n"
                        
                        # Show task details
                        for i, task in enumerate(selected_report['tasks'], 1):
                            status = "✅" if task.get('done', False) else "❌"
                            task_text = task.get('text', 'Task')[:50]
                            detail_text += f"   {status} {task_text}\n"
                    
                    # Create inline keyboard with back button
                    markup = telebot.types.InlineKeyboardMarkup()
                    back_button = telebot.types.InlineKeyboardButton(
                        text="⬅️ Back to Reports",
                        callback_data="show_reports"
                    )
                    help_button = telebot.types.InlineKeyboardButton(
                        text="❓ Help",
                        callback_data="show_help"
                    )
                    markup.add(back_button, help_button)
                    
                    bot.send_message(call.message.chat.id, detail_text, reply_markup=markup, parse_mode='Markdown')
                    logger.info(f"✅ Report details shown for report {report_id}")
                else:
                    bot.send_message(call.message.chat.id, "❌ Report not found.", reply_markup=None)
            else:
                bot.send_message(call.message.chat.id, "❌ Unable to fetch report details.", reply_markup=None)
                
        elif call.data == "show_reports":
            # Handle back to reports button
            bot.delete_message(call.message.chat.id, call.message.message_id)
            
            # Create fake message for reports function
            fake_message = type('Message', (), {
                'chat': call.message.chat,
                'from_user': call.from_user,
                'message_id': call.message.message_id
            })()
            
            # Show reports
            send_reports(fake_message)
            
        elif call.data.startswith('cmd_'):
            command = '/' + call.data.replace('cmd_', '')
            
            
            bot.delete_message(call.message.chat.id, call.message.message_id)
            
            
            if command == '/reports':
                
                fake_message = type('Message', (), {
                    'chat': call.message.chat,
                    'from_user': call.from_user,
                    'message_id': call.message.message_id
                })()
                send_reports(fake_message)
            elif command == '/tasks':
                fake_message = type('Message', (), {
                    'chat': call.message.chat,
                    'from_user': call.from_user,
                    'message_id': call.message.message_id
                })()
                send_tasks(fake_message)
            elif command == '/team':
                fake_message = type('Message', (), {
                    'chat': call.message.chat,
                    'from_user': call.from_user,
                    'message_id': call.message.message_id
                })()
                send_team(fake_message)
            elif command == '/dollar':
                fake_message = type('Message', (), {
                    'chat': call.message.chat,
                    'from_user': call.from_user,
                    'message_id': call.message.message_id
                })()
                send_dollar_price(fake_message)
            elif command == '/gold':
                fake_message = type('Message', (), {
                    'chat': call.message.chat,
                    'from_user': call.from_user,
                    'message_id': call.message.message_id
                })()
                send_gold_price(fake_message)
                
    except Exception as e:
        logger.error(f"❌ Error handling callback: {e}")
        try:
            bot.answer_callback_query(call.id, "❌ Error executing command. Please try again.")
        except:
            pass  # Ignore errors in callback query response

if __name__ == "__main__":
    logger.info("🚀 Starting Telegram Bot...")
    logger.info("✅ Bot is running and listening for messages...")
    bot.polling(none_stop=True)