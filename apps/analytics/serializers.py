from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import UserPerformance, SimulationAnalytics, PerformanceTrend, SkillAssessment, MLModelMetrics


class UserPerformanceSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    category_scores = serializers.DictField(default=dict)
    threat_type_scores = serializers.DictField(default=dict)
    learning_curve = serializers.ListField(child=serializers.FloatField(), default=list)
    weak_areas = serializers.ListField(child=serializers.CharField(), default=list)
    strong_areas = serializers.ListField(child=serializers.CharField(), default=list)
    skill_levels = serializers.DictField(default=dict)
    recommended_scenarios = serializers.ListField(child=serializers.UUIDField(), default=list)
    last_updated = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)
    
    class Meta:
        model = UserPerformance
        fields = [
            'id', 'user_email', 'user_name', 'total_simulations', 'total_time_spent',
            'average_score', 'average_accuracy', 'average_response_time',
            'category_scores', 'threat_type_scores', 'learning_curve',
            'improvement_rate', 'weak_areas', 'strong_areas', 'skill_levels',
            'recommended_scenarios', 'recommended_difficulty', 'last_updated'
        ]
    
    @extend_schema_field(serializers.EmailField())
    def get_user_email(self, obj):
        return obj.user.email
    
    @extend_schema_field(serializers.CharField())
    def get_user_name(self, obj):
        return obj.user.get_full_name()


class SimulationAnalyticsSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    session_id = serializers.SerializerMethodField()
    scenario_title = serializers.SerializerMethodField()
    decision_times = serializers.ListField(child=serializers.IntegerField(), default=list)
    decision_patterns = serializers.DictField(default=dict)
    hesitation_points = serializers.ListField(child=serializers.IntegerField(), default=list)
    common_mistakes = serializers.ListField(child=serializers.DictField(), default=list)
    mistake_categories = serializers.DictField(default=dict)
    skill_improvement = serializers.DictField(default=dict)
    created_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)
    
    class Meta:
        model = SimulationAnalytics
        fields = [
            'id', 'session_id', 'scenario_title', 'decision_times', 'decision_patterns',
            'hesitation_points', 'time_based_score', 'accuracy_based_score',
            'efficiency_score', 'common_mistakes', 'mistake_categories',
            'learning_progress', 'skill_improvement', 'predicted_score',
            'confidence_level', 'created_at'
        ]
    
    @extend_schema_field(serializers.UUIDField())
    def get_session_id(self, obj):
        return obj.session.id if obj.session else None
    
    @extend_schema_field(serializers.CharField())
    def get_scenario_title(self, obj):
        return obj.session.scenario.title if obj.session and obj.session.scenario else None


class PerformanceTrendSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    date = serializers.DateField(format="%Y-%m-%d")
    
    class Meta:
        model = PerformanceTrend
        fields = [
            'id', 'period', 'date', 'simulations_completed',
            'average_score', 'total_time', 'improvement'
        ]


class SkillAssessmentSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    skill_display = serializers.SerializerMethodField()
    assessed_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)
    
    class Meta:
        model = SkillAssessment
        fields = [
            'id', 'skill', 'skill_display', 'level',
            'score', 'progress', 'assessed_at'
        ]
    
    @extend_schema_field(serializers.CharField())
    def get_skill_display(self, obj):
        return obj.get_skill_display()


class MLModelMetricsSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    trained_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)
    updated_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)
    
    class Meta:
        model = MLModelMetrics
        fields = [
            'id', 'model_name', 'version', 'accuracy', 'precision',
            'recall', 'f1_score', 'training_samples', 'validation_samples',
            'trained_at', 'updated_at'
        ]


class DashboardStatsSerializer(serializers.Serializer):
    total_simulations = serializers.IntegerField()
    completed_simulations = serializers.IntegerField()
    average_score = serializers.FloatField()
    total_time = serializers.IntegerField()
    weekly_simulations = serializers.IntegerField()
    category_stats = serializers.ListField(child=serializers.DictField())
    recent_activity = serializers.ListField(child=serializers.DictField())
    trend_data = serializers.DictField()
    weak_areas = serializers.ListField(child=serializers.CharField())
    strong_areas = serializers.ListField(child=serializers.CharField())
    recommended_scenarios = serializers.ListField(child=serializers.UUIDField())
    skill_level = serializers.DictField()


class ComparisonStatsSerializer(serializers.Serializer):
    user = serializers.DictField()
    global_stats = serializers.DictField()
    peers = serializers.DictField()
    percentile = serializers.FloatField()


# Add these serializers for the views that were showing errors
class PerformanceViewSerializer(serializers.Serializer):
    """Serializer for PerformanceView response"""
    user = serializers.DictField()
    overall_score = serializers.FloatField()
    simulations_completed = serializers.IntegerField()
    weak_areas = serializers.ListField(child=serializers.CharField())
    strong_areas = serializers.ListField(child=serializers.CharField())
    recent_activity = serializers.ListField(child=serializers.DictField())


class LearningPathViewSerializer(serializers.Serializer):
    """Serializer for LearningPathView response"""
    path_id = serializers.UUIDField()
    path_name = serializers.CharField()
    progress = serializers.FloatField()
    completed_modules = serializers.IntegerField()
    total_modules = serializers.IntegerField()
    next_module = serializers.DictField(allow_null=True)


class SkillAssessmentsViewSerializer(serializers.Serializer):
    """Serializer for SkillAssessmentsView response"""
    skills = SkillAssessmentSerializer(many=True)
    overall_level = serializers.CharField()
    next_milestone = serializers.DictField()


class ComparisonViewSerializer(serializers.Serializer):
    """Serializer for ComparisonView response"""
    user_score = serializers.FloatField()
    average_score = serializers.FloatField()
    percentile = serializers.IntegerField()
    peer_comparison = serializers.DictField()


class DashboardStatsViewSerializer(serializers.Serializer):
    """Serializer for DashboardStatsView response"""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    total_simulations = serializers.IntegerField()
    completed_simulations = serializers.IntegerField()
    average_score = serializers.FloatField()
    recent_activities = serializers.ListField(child=serializers.DictField())