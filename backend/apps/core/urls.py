from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'settings', views.SystemSettingViewSet, basename='setting')
router.register(r'audit-logs', views.AuditLogViewSet, basename='audit-log')
router.register(r'error-logs', views.ErrorLogViewSet, basename='error-log')
router.register(r'api-logs', views.APILogViewSet, basename='api-log')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
    path('admin/stats/', views.DashboardStatsView.as_view(), name='admin-stats'),
]