import random
import string
import hashlib
import hmac
import base64
from django.core.mail import send_mail
from django.conf import settings
import threading
from .models import SystemSetting

def generate_random_string(length=32):
    """Generate random string"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_secure_token(data, key=None):
    """Generate secure token using HMAC"""
    if key is None:
        key = settings.SECRET_KEY
    message = str(data).encode('utf-8')
    key_bytes = key.encode('utf-8')
    signature = hmac.new(key_bytes, message, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')

def get_setting(key, default=None):
    """Get system setting by key"""
    try:
        setting = SystemSetting.objects.get(key=key, is_active=True)
        return setting.value
    except SystemSetting.DoesNotExist:
        return default

def send_email_notification(recipients, subject, message, html_message=None):
    """Send email notification asynchronously"""
    def send_email_thread():
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients if isinstance(recipients, list) else [recipients],
                html_message=html_message,
                fail_silently=False
            )
        except Exception as e:
            print(f"Error sending email: {e}")
            
    thread = threading.Thread(target=send_email_thread)
    thread.start()
    return True

def format_currency(amount, currency='USD'):
    """Format currency"""
    symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'NGN': '₦',
    }
    symbol = symbols.get(currency, '$')
    return f"{symbol}{amount:,.2f}"

def truncate_words(text, words=30):
    """Truncate text to specified number of words"""
    word_list = text.split()
    if len(word_list) <= words:
        return text
    return ' '.join(word_list[:words]) + '...'

def get_client_ip(request):
    """Get client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_file_extension(filename):
    """Get file extension from filename"""
    return filename.split('.')[-1].lower() if '.' in filename else ''

def generate_otp(length=6):
    """Generate OTP code"""
    return ''.join(random.choices(string.digits, k=length))