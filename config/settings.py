from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# Application definition
INSTALLED_APPS = [
    # Custom apps (order matters - users first)
    "apps.users",
    "apps.core",
    "apps.content",
    "apps.tutor",
    "apps.simulations",
    "apps.analytics",
    "apps.meetings",  # Meetings app
    
    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "channels",
    "channels_redis",
    "django_extensions",
    
    # Django built-in apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
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

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

# Redis Cache & Channel Layers
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

# Meeting/WebRTC Settings
MEETING_SETTINGS = {
    'MAX_PARTICIPANTS_PER_MEETING': 50,
    'MAX_MEETING_DURATION_HOURS': 4,
    'ALLOW_RECORDING': True,
    'ALLOW_SCREEN_SHARE': True,
    'ALLOW_CHAT': True,
    'ENABLE_WAITING_ROOM': True,
    'AUTO_RECORDING': False,
    'MEETING_CODE_LENGTH': 10,
    'INVITATION_EXPIRY_DAYS': 7,
}

ICE_SERVERS = [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
    {'urls': 'stun:stun2.l.google.com:19302'},
    {'urls': 'stun:stun3.l.google.com:19302'},
    {'urls': 'stun:stun4.l.google.com:19302'},
]

# Free TURN servers for reliable WebRTC connectivity (development only)
TURN_SERVERS = [
    {
        'urls': 'turn:openrelay.metered.ca:80',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
    },
    {
        'urls': 'turn:openrelay.metered.ca:443',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
    },
    {
        'urls': 'turn:openrelay.metered.ca:443?transport=tcp',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
    },
]

MEETING_RECORDING_STORAGE = {
    'STORAGE_BACKEND': 'django.core.files.storage.FileSystemStorage',
    'STORAGE_PATH': 'meeting_recordings/',
    'ALLOWED_EXTENSIONS': ['.webm', '.mp4'],
    'MAX_FILE_SIZE': 1024 * 1024 * 500,
}

# Auth validators
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom user model
AUTH_USER_MODEL = "users.User"

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@skyshield.com'
FRONTEND_URL = 'http://localhost:3000'

# REST Framework settings
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": "",
    "AUDIENCE": None,
    "ISSUER": None,
    "JSON_ENCODER": None,
    "JWK_URL": None,
    "LEEWAY": 0,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "USER_AUTHENTICATION_RULE": "rest_framework_simplejwt.authentication.default_user_authentication_rule",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "TOKEN_USER_CLASS": "rest_framework_simplejwt.models.TokenUser",
    "JTI_CLAIM": "jti",
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://skyshieldedu.com",
    "https://www.skyshieldedu.com",
]

# Allow the actual deployed frontend URL set in the environment (Render/Vercel etc.)
_frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
if _frontend_url and _frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(_frontend_url)

# Also allow preview/branch deployment URLs from common platforms
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[\w-]+\.onrender\.com$",
    r"^https://[\w-]+\.vercel\.app$",
    r"^https://[\w-]+\.netlify\.app$",
]

CORS_ALLOW_CREDENTIALS = True

# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'api': {
            'format': '{asctime} {message}',
            'style': '{',
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'api_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'api',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'api_file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'api.log',
            'formatter': 'api',
        },
        'websocket_file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'websocket.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.server': {
            'handlers': ['api_console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'apps.meetings': {
            'handlers': ['console', 'file', 'websocket_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'channels': {
            'handlers': ['console', 'websocket_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'mail': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ==============================================================================
# BEAUTIFUL SWAGGER UI WITH CUSTOM HEADER
# ==============================================================================

SPECTACULAR_SETTINGS = {
    'TITLE': 'SkyShield Edu API',
    'DESCRIPTION': '''
SkyShield Educational Platform API - Your gateway to cybersecurity training.

## 🔐 Authentication
All endpoints (except login/register) require JWT Bearer token authentication.
Click the Authorize button and enter: `Bearer <your_token>`
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_DIST': 'SIDECAR',
    'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    'REDOC_DIST': 'SIDECAR',
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'AUTHENTICATION_WHITELIST': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    
    # 🌈 SIMPLE BUT BEAUTIFUL UI SETTINGS
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': False,
        'displayRequestDuration': True,
        'filter': True,
        'tryItOutEnabled': True,
        'syntaxHighlight': {
            'theme': 'monokai'
        },
        'docExpansion': 'list',
        'defaultModelsExpandDepth': -1,
    },
    
    # 🎨 CUSTOM HEADER STYLING (This makes the header beautiful!)
    'SWAGGER_UI_STATIC': {
        'customStyle': '''
            .topbar-wrapper { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .topbar-wrapper a {
                color: white !important;
                font-size: 1.5em;
                font-weight: 600;
                text-decoration: none;
            }
            .topbar-wrapper span {
                color: white !important;
            }
            .info { 
                background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
                padding: 20px;
                border-radius: 12px;
                border-left: 4px solid #667eea;
            }
            .info h1 { 
                color: #333;
                font-size: 2.2em;
                margin-bottom: 10px;
            }
            .info .description { 
                color: #666;
                font-size: 1.1em;
                line-height: 1.6;
            }
            .scheme-container {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
            .btn.authorize {
                background-color: #4CAF50 !important;
                border-color: #4CAF50 !important;
                color: white !important;
                transition: all 0.3s ease;
            }
            .btn.authorize:hover {
                background-color: #45a049 !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .opblock-tag {
                font-size: 1.3em;
                font-weight: 600;
                color: #333;
                border-bottom: 2px solid #667eea;
                padding-bottom: 10px;
                margin-top: 20px;
            }
            .opblock {
                border-radius: 8px !important;
                margin: 10px 0 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
                transition: all 0.3s ease !important;
            }
            .opblock:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                transform: translateY(-2px);
            }
            .opblock-summary {
                padding: 12px 15px !important;
            }
            .opblock-summary-method {
                border-radius: 4px !important;
                font-weight: 600 !important;
                padding: 6px 12px !important;
            }
            .opblock-summary-path {
                font-weight: 600 !important;
                color: #333 !important;
            }
            .response-col_status {
                font-weight: 600 !important;
            }
            .model-box {
                background: #f8f9fa !important;
                border-radius: 8px !important;
                padding: 15px !important;
            }
        ''',
    },
    
    # 🔧 ENUM BEHAVIOR
    'ENUM_ADD_EXPLICIT_BLANK_NULL_CHOICE': False,
    'ENUM_GENERATE_CHOICE_DESCRIPTION': True,
    
    # 🔗 ENUM NAME OVERRIDES
    'ENUM_NAME_OVERRIDES': {
        'DifficultyEnum': [
            'apps.content.models.LearningMaterial.DIFFICULTY_CHOICES',
            'apps.content.models.LearningPath.DIFFICULTY_CHOICES',
            'apps.tutor.models.TeachingMaterial.DIFFICULTY_LEVELS',
            'apps.simulations.models.Scenario.DIFFICULTY_LEVELS',
        ],
        'LearningMaterialMaterialTypeEnum': 'apps.content.models.LearningMaterial.MATERIAL_TYPE_CHOICES',
        'PathEnrollmentStatusEnum': 'apps.content.models.PathEnrollment.STATUS_CHOICES',
        'TeachingMaterialMaterialTypeEnum': 'apps.tutor.models.TeachingMaterial.MATERIAL_TYPES',
        'TeachingSessionTypeEnum': 'apps.tutor.models.TeachingSession.SESSION_TYPES',
        'NotificationTypeEnum': 'apps.core.models.Notification.NOTIFICATION_TYPES',
        'FileTypeEnum': 'apps.core.models.FileUpload.FILE_TYPES',
        'ErrorLevelEnum': 'apps.core.models.ErrorLog.ERROR_LEVELS',
        'AuditActionEnum': 'apps.core.models.AuditLog.ACTION_TYPES',
        'MeetingStatusEnum': 'apps.meetings.models.Meeting.MEETING_STATUS',
        'ParticipantStatusEnum': 'apps.meetings.models.MeetingParticipant.PARTICIPANT_STATUS',
        'SimulationSessionStatusEnum': 'apps.simulations.models.SimulationSession.STATUS_CHOICES',
        'DecisionTypeEnum': 'apps.simulations.models.UserDecision.DECISION_TYPES',
        'UserActivityTypeEnum': 'apps.users.models.UserActivity.ACTIVITY_TYPES',
        'DeviceTypeEnum': 'apps.users.models.UserDevice.DEVICE_TYPES',
        'FeedbackRatingEnum': 'apps.simulations.models.ScenarioFeedback.RATINGS',
    },
}