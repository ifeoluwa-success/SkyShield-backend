from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'scenarios', views.ScenarioViewSet, basename='scenario')
router.register(r'sessions', views.SimulationSessionViewSet, basename='session')
router.register(r'achievements', views.AchievementViewSet, basename='achievement')

# New incident/Genie endpoints (registered via incident_views)
from .incident_views import IncidentRunViewSet, GenieViewSet
router.register('incidents', IncidentRunViewSet, basename='incident-run')
router.register('genie', GenieViewSet, basename='genie')

from .course_views import (
    CourseViewSet,
    CourseEnrollmentViewSet,
    CourseCertificateViewSet,
)
router.register('courses', CourseViewSet, basename='course')
router.register('enrollments', CourseEnrollmentViewSet, basename='enrollment')
router.register('certificates', CourseCertificateViewSet, basename='certificate')

urlpatterns = [
    path('', include(router.urls)),  # This already includes all router endpoints
    
    # Keep only the nested comment routes since they're not in the router
    path('scenarios/<uuid:scenario_pk>/comments/',
         views.CommentViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='scenario-comments'),
    path('scenarios/<uuid:scenario_pk>/comments/<uuid:pk>/',
         views.CommentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}),
         name='scenario-comment-detail'),
    path('feedback/', views.FeedbackView.as_view(), name='feedback'),
    
    # New certifications endpoint
    path('certifications/', views.UserCertificationsView.as_view(), name='user-certifications'),
]