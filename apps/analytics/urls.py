from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.DashboardStatsView.as_view(), name='dashboard'),
    path('performance/', views.PerformanceView.as_view(), name='performance'),
    path('trends/', views.PerformanceTrendsView.as_view(), name='trends'),
    path('skills/', views.SkillAssessmentsView.as_view(), name='skills'),
    path('learning-path/', views.LearningPathView.as_view(), name='learning-path'),
    path('comparison/', views.ComparisonView.as_view(), name='comparison'),
]