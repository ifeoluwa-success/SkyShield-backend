from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class UserPerformance(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='performance')
    
    # Overall stats
    total_simulations = models.IntegerField(default=0)
    total_time_spent = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    average_accuracy = models.FloatField(default=0.0)
    average_response_time = models.FloatField(default=0.0)
    
    # Category performance
    category_scores = models.JSONField(default=dict)
    threat_type_scores = models.JSONField(default=dict)
    
    # Learning metrics
    learning_curve = models.JSONField(default=list)
    improvement_rate = models.FloatField(default=0.0)
    
    # Weak/strong areas
    weak_areas = models.JSONField(default=list)
    strong_areas = models.JSONField(default=list)
    
    # Skill levels
    skill_levels = models.JSONField(default=dict)
    
    # Recommendations
    recommended_scenarios = models.JSONField(default=list)
    recommended_difficulty = models.CharField(max_length=20, default='beginner')
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_performance'


class SimulationAnalytics(models.Model):
    session = models.OneToOneField('simulations.SimulationSession', on_delete=models.CASCADE, related_name='analytics')
    
    # Decision analysis
    decision_times = models.JSONField(default=list)
    decision_patterns = models.JSONField(default=dict)
    hesitation_points = models.JSONField(default=list)
    
    # Performance metrics
    time_based_score = models.FloatField(default=0.0)
    accuracy_based_score = models.FloatField(default=0.0)
    efficiency_score = models.FloatField(default=0.0)
    
    # Mistake analysis
    common_mistakes = models.JSONField(default=list)
    mistake_categories = models.JSONField(default=dict)
    
    # Learning insights
    learning_progress = models.FloatField(default=0.0)
    skill_improvement = models.JSONField(default=dict)
    
    # Predictions
    predicted_score = models.FloatField(null=True, blank=True)
    confidence_level = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'simulation_analytics'


class PerformanceTrend(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='performance_trends')
    
    # Time period
    period = models.CharField(max_length=20, choices=(
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ))
    date = models.DateField()
    
    # Metrics
    simulations_completed = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    total_time = models.IntegerField(default=0)
    improvement = models.FloatField(default=0.0)
    
    class Meta:
        db_table = 'performance_trends'
        unique_together = ['user', 'period', 'date']


class SkillAssessment(models.Model):
    SKILLS = (
        ('threat_detection', 'Threat Detection'),
        ('incident_response', 'Incident Response'),
        ('risk_assessment', 'Risk Assessment'),
        ('communication', 'Communication Security'),
        ('navigation', 'Navigation Security'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skill_assessments')
    skill = models.CharField(max_length=50, choices=SKILLS)
    level = models.IntegerField(default=1)
    score = models.FloatField(default=0.0)
    progress = models.FloatField(default=0.0)
    assessed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'skill_assessments'
        unique_together = ['user', 'skill']


class MLModelMetrics(models.Model):
    model_name = models.CharField(max_length=100)
    version = models.CharField(max_length=20)
    
    # Performance metrics
    accuracy = models.FloatField(default=0.0)
    precision = models.FloatField(default=0.0)
    recall = models.FloatField(default=0.0)
    f1_score = models.FloatField(default=0.0)
    
    # Training data
    training_samples = models.IntegerField(default=0)
    validation_samples = models.IntegerField(default=0)
    
    # Timestamps
    trained_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ml_model_metrics'