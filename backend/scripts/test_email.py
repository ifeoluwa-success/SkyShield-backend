import os
import sys
import django
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

# Add the project root to sys.path so 'config' can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def send_test_email(to_email):
    subject = 'SkyShield - Aviation Security Test'
    from_email = settings.DEFAULT_FROM_EMAIL
    
    # Mock user object for the template
    class MockUser:
        username = 'AviationSpecialist'
    
    # Context for the template
    context = {
        'user': MockUser(),
        'frontend_url': settings.FRONTEND_URL,
        'support_email': settings.SUPPORT_EMAIL,
    }
    
    # Render the HTML template (uses the Amber Gold theme)
    html_content = render_to_string('account/email/welcome_message.html', context)
    text_content = strip_tags(html_content)
    
    msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    msg.attach_alternative(html_content, "text/html")
    
    try:
        msg.send()
        print(f"✅ Test email sent successfully to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        target = sys.argv[1]
        send_test_email(target)
    else:
        print("Usage: python scripts/test_email.py <marithamiracle@gmail.com>")