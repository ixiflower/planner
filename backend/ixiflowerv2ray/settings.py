from pathlib import Path
import os
try:
    from dotenv import load_dotenv  # optional in restricted environments
    load_dotenv()
except Exception:
    # If python-dotenv is not installed (e.g., proxy blocks pip), continue without it.
    # Django will rely on real environment variables only.
    pass
from sim.services import initialize_gspread

STREAM_API_KEY = os.getenv("STREAM_API_KEY")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET")

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-uer+0@+y3abl7%lot3lqmr$=5e13saz1xtok0ghlt@(tp-it&=")

DEBUG = os.getenv("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "0.0.0.0,127.0.0.1,localhost").split(",")
ALLOWED_HOSTS.extend([".vercel.app", "ixiflower32.pythonanywhere.com"])
# In development, allow all hosts to avoid DisallowedHost while testing on LAN
if DEBUG:
    ALLOWED_HOSTS = ["*"]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'authentication.backends.TokenHeaderAuthentication',
    ),
}

INSTALLED_APPS = [
    "corsheaders",  
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "tickets",  
    "authentication",  
    "rest_framework",
    "sim",
    "structure",
]

AUTH_USER_MODEL = "authentication.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    # "django.middleware.csrf.CsrfViewMiddleware",  # Disabled CSRF
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ixiflowerv2ray.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


# CORS Settings - get from environment variable
cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://0.0.0.0,http://0.0.0.0:80,http://127.0.0.1,http://localhost:83,http://192.168.0.106:83,http://192.168.0.101:84").split(",")
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins]
CORS_ALLOW_CREDENTIALS = True

# Additional CORS settings for better compatibility
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Allow all origins in development mode (can be restricted in production)
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^http://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$",  # Any IP
        r"^http://localhost(:\d+)?$",
        r"^http://127\.0\.0\.1(:\d+)?$",
    ]

# CSRF Trusted Origins - same as CORS origins
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
CSRF_TRUSTED_ORIGINS.extend([
    "http://localhost:83",
    "http://192.168.0.106:83",
    "http://127.0.0.1:83",
    "http://192.168.0.101:84",
])


# Initialize GSpread client only if credentials are available
if os.getenv("CLIENT_EMAIL") and os.getenv("PRIVATE_KEY"):
    try:
        GSPREAD_CLIENT = initialize_gspread()
    except Exception as e:
        print(f"Warning: Failed to initialize GSpread: {e}")
        GSPREAD_CLIENT = None
else:
    GSPREAD_CLIENT = None  