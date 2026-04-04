from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import consumers
from . import views

router = DefaultRouter()
router.register(r'meetings', views.MeetingViewSet, basename='meeting')
router.register(r'invitations', views.MeetingInvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),  # This already includes all router-registered views
    path('upcoming/', views.UpcomingMeetingsView.as_view(), name='upcoming-meetings'),
    # REMOVED the manual join path since it's already handled by the router
]

# WebSocket URL routing (for channels)
websocket_urlpatterns = [
    path('ws/meeting/<str:room_name>/', consumers.MeetingConsumer.as_asgi()),
]