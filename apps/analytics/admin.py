from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    UserPerformance, SimulationAnalytics, PerformanceTrend,
    SkillAssessment, MLModelMetrics
)
import json


@admin.register(UserPerformance)
class UserPerformanceAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'total_simulations', 'average_score_display', 
                   'average_accuracy_display', 'improvement_rate_display', 'last_updated']
    list_filter = ['last_updated']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['user', 'total_simulations', 'total_time_spent', 
                      'average_score', 'average_accuracy', 'average_response_time',
                      'category_scores', 'threat_type_scores', 'learning_curve',
                      'improvement_rate', 'weak_areas', 'strong_areas',
                      'skill_levels', 'recommended_scenarios', 'recommended_difficulty',
                      'last_updated', 'performance_summary']
    
    fieldsets = (
        ('User', {
            'fields': ('user_link',)
        }),
        ('Overall Stats', {
            'fields': ('total_simulations', 'total_time_spent', 'average_score',
                      'average_accuracy', 'average_response_time', 'improvement_rate')
        }),
        ('Performance Summary', {
            'fields': ('performance_summary',),
        }),
        ('Category Performance', {
            'fields': ('category_scores', 'threat_type_scores'),
            'classes': ('collapse',)
        }),
        ('Skill Analysis', {
            'fields': ('weak_areas', 'strong_areas', 'skill_levels'),
            'classes': ('collapse',)
        }),
        ('Recommendations', {
            'fields': ('recommended_scenarios', 'recommended_difficulty'),
            'classes': ('collapse',)
        }),
        ('Learning Data', {
            'fields': ('learning_curve',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('last_updated',),
            'classes': ('collapse',)
        }),
    )
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def average_score_display(self, obj):
        return f"{obj.average_score:.2f}%"
    average_score_display.short_description = 'Avg Score'
    
    def average_accuracy_display(self, obj):
        return f"{obj.average_accuracy:.2f}%"
    average_accuracy_display.short_description = 'Avg Accuracy'
    
    def improvement_rate_display(self, obj):
        color = 'green' if obj.improvement_rate > 0 else 'red'
        return format_html('<span style="color: {};">{}%</span>', color, obj.improvement_rate)
    improvement_rate_display.short_description = 'Improvement'
    
    def performance_summary(self, obj):
        weak_count = len(obj.weak_areas) if obj.weak_areas else 0
        strong_count = len(obj.strong_areas) if obj.strong_areas else 0
        
        return format_html(
            '<div style="background:#f8f9fa;padding:10px;">'
            '<strong>Total Simulations:</strong> {}<br>'
            '<strong>Average Score:</strong> {}%<br>'
            '<strong>Weak Areas:</strong> {}<br>'
            '<strong>Strong Areas:</strong> {}<br>'
            '<strong>Recommended Difficulty:</strong> {}'
            '</div>',
            obj.total_simulations,
            round(obj.average_score, 2),
            ', '.join(obj.weak_areas[:5]) if weak_count else 'None',
            ', '.join(obj.strong_areas[:5]) if strong_count else 'None',
            obj.recommended_difficulty
        )
    performance_summary.short_description = 'Summary'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SimulationAnalytics)
class SimulationAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['session_link', 'time_based_score_display', 'accuracy_based_score_display',
                   'efficiency_score_display', 'confidence_level_display', 'created_at']
    list_filter = ['created_at']
    search_fields = ['session__user__email', 'session__scenario__title']
    readonly_fields = ['session', 'decision_times', 'decision_patterns',
                      'hesitation_points', 'time_based_score', 'accuracy_based_score',
                      'efficiency_score', 'common_mistakes', 'mistake_categories',
                      'learning_progress', 'skill_improvement', 'predicted_score',
                      'confidence_level', 'created_at', 'analytics_summary']
    
    fieldsets = (
        ('Session', {
            'fields': ('session_link',)
        }),
        ('Analytics Summary', {
            'fields': ('analytics_summary',),
        }),
        ('Scores', {
            'fields': ('time_based_score', 'accuracy_based_score', 
                      'efficiency_score', 'predicted_score', 'confidence_level')
        }),
        ('Decision Analysis', {
            'fields': ('decision_times', 'decision_patterns', 'hesitation_points'),
            'classes': ('collapse',)
        }),
        ('Mistake Analysis', {
            'fields': ('common_mistakes', 'mistake_categories'),
            'classes': ('collapse',)
        }),
        ('Learning Insights', {
            'fields': ('learning_progress', 'skill_improvement'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def session_link(self, obj):
        url = reverse('admin:simulations_simulationsession_change', args=[obj.session.id])
        return format_html('<a href="{}">Session {}</a>', url, str(obj.session.id)[:8])
    session_link.short_description = 'Session'
    
    def time_based_score_display(self, obj):
        return f"{obj.time_based_score:.2f}%"
    time_based_score_display.short_description = 'Time Score'
    
    def accuracy_based_score_display(self, obj):
        return f"{obj.accuracy_based_score:.2f}%"
    accuracy_based_score_display.short_description = 'Accuracy Score'
    
    def efficiency_score_display(self, obj):
        return f"{obj.efficiency_score:.2f}%"
    efficiency_score_display.short_description = 'Efficiency'
    
    def confidence_level_display(self, obj):
        return f"{obj.confidence_level:.2f}%"
    confidence_level_display.short_description = 'Confidence'
    
    def analytics_summary(self, obj):
        return format_html(
            '<div style="background:#f8f9fa;padding:10px;">'
            '<strong>Time Score:</strong> {}%<br>'
            '<strong>Accuracy Score:</strong> {}%<br>'
            '<strong>Efficiency:</strong> {}%<br>'
            '<strong>Predicted Score:</strong> {}%<br>'
            '<strong>Confidence:</strong> {}%<br>'
            '<strong>Learning Progress:</strong> {}%'
            '</div>',
            round(obj.time_based_score, 2),
            round(obj.accuracy_based_score, 2),
            round(obj.efficiency_score, 2),
            round(obj.predicted_score, 2) if obj.predicted_score else 'N/A',
            round(obj.confidence_level, 2),
            round(obj.learning_progress, 2)
        )
    analytics_summary.short_description = 'Summary'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PerformanceTrend)
class PerformanceTrendAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'period_badge', 'date', 'simulations_completed',
                   'average_score_display', 'total_time_display', 'improvement_display']
    list_filter = ['period', 'date']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['user', 'period', 'date', 'simulations_completed',
                      'average_score', 'total_time', 'improvement']
    date_hierarchy = 'date'
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def period_badge(self, obj):
        colors = {
            'daily': 'blue',
            'weekly': 'green',
            'monthly': 'purple',
        }
        color = colors.get(obj.period, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_period_display()
        )
    period_badge.short_description = 'Period'
    
    def average_score_display(self, obj):
        return f"{obj.average_score:.2f}%"
    average_score_display.short_description = 'Avg Score'
    
    def total_time_display(self, obj):
        minutes = obj.total_time // 60
        seconds = obj.total_time % 60
        return f"{minutes}m {seconds}s"
    total_time_display.short_description = 'Total Time'
    
    def improvement_display(self, obj):
        color = 'green' if obj.improvement > 0 else 'red'
        return format_html('<span style="color: {};">{}%</span>', color, obj.improvement)
    improvement_display.short_description = 'Improvement'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SkillAssessment)
class SkillAssessmentAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'skill_badge', 'level', 'score_display', 
                   'progress_bar', 'assessed_at']
    list_filter = ['skill', 'level', 'assessed_at']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['user', 'skill', 'level', 'score', 'progress', 'assessed_at']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def skill_badge(self, obj):
        return obj.get_skill_display()
    skill_badge.short_description = 'Skill'
    
    def score_display(self, obj):
        return f"{obj.score:.2f}%"
    score_display.short_description = 'Score'
    
    def progress_bar(self, obj):
        percentage = obj.progress
        color = 'green' if percentage >= 80 else 'orange' if percentage >= 50 else 'red'
        return format_html(
            '<div style="width:100px; height:20px; background-color:#f0f0f0; border-radius:10px;">'
            '<div style="width:{}%; height:20px; background-color:{}; border-radius:10px;"></div>'
            '</div>',
            percentage, color
        )
    progress_bar.short_description = 'Progress'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(MLModelMetrics)
class MLModelMetricsAdmin(admin.ModelAdmin):
    list_display = ['model_name', 'version', 'accuracy_display', 'precision_display', 
                   'recall_display', 'f1_score_display', 'training_samples', 'trained_at']
    list_filter = ['model_name', 'trained_at']
    search_fields = ['model_name', 'version']
    readonly_fields = ['model_name', 'version', 'accuracy', 'precision',
                      'recall', 'f1_score', 'training_samples', 'validation_samples',
                      'trained_at', 'updated_at', 'model_stats']
    
    fieldsets = (
        ('Model Information', {
            'fields': ('model_name', 'version')
        }),
        ('Performance Metrics', {
            'fields': ('accuracy', 'precision', 'recall', 'f1_score', 'model_stats')
        }),
        ('Training Data', {
            'fields': ('training_samples', 'validation_samples')
        }),
        ('Timestamps', {
            'fields': ('trained_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def accuracy_display(self, obj):
        return f"{obj.accuracy * 100:.2f}%"
    accuracy_display.short_description = 'Accuracy'
    
    def precision_display(self, obj):
        return f"{obj.precision * 100:.2f}%"
    precision_display.short_description = 'Precision'
    
    def recall_display(self, obj):
        return f"{obj.recall * 100:.2f}%"
    recall_display.short_description = 'Recall'
    
    def f1_score_display(self, obj):
        return f"{obj.f1_score * 100:.2f}%"
    f1_score_display.short_description = 'F1 Score'
    
    def model_stats(self, obj):
        return format_html(
            '<div style="background:#f8f9fa;padding:10px;">'
            '<strong>Accuracy:</strong> {}%<br>'
            '<strong>Precision:</strong> {}%<br>'
            '<strong>Recall:</strong> {}%<br>'
            '<strong>F1 Score:</strong> {}%'
            '</div>',
            round(obj.accuracy * 100, 2),
            round(obj.precision * 100, 2),
            round(obj.recall * 100, 2),
            round(obj.f1_score * 100, 2)
        )
    model_stats.short_description = 'Stats'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False