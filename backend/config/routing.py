from django.urls import path

from apps.meetings.consumers import MeetingConsumer
from apps.simulations.consumers import MissionConsumer

websocket_urlpatterns = [
    path('ws/meeting/<str:room_name>/', MeetingConsumer.as_asgi()),
    path('ws/mission/<uuid:run_id>/', MissionConsumer.as_asgi()),
]

