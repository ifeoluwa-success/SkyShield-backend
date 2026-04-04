from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import SystemSetting, Notification

User = get_user_model()

class CoreTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_health_check(self):
        response = self.client.get('/api/core/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'healthy')
    
    def test_system_settings(self):
        setting = SystemSetting.objects.create(
            key='test_key',
            value='test_value',
            description='Test setting',
            is_public=True
        )
        
        response = self.client.get('/api/core/settings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['key'], 'test_key')
    
    def test_notifications(self):
        notification = Notification.objects.create(
            title='Test Notification',
            message='This is a test',
            notification_type='info',
            is_global=True
        )
        
        response = self.client.get('/api/core/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        
        # Mark as read
        response = self.client.post(f'/api/core/notifications/{notification.id}/mark_read/')
        self.assertEqual(response.status_code, 200)