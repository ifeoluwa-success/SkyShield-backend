from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Scenario(models.Model):
    DIFFICULTY_LEVELS = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    )
    
    CATEGORIES = (
        ('communication', 'Communication'),
        ('navigation', 'Navigation'),
        ('data_integrity', 'Data Integrity'),
        ('social_engineering', 'Social Engineering'),
        ('ransomware', 'Ransomware'),
        ('unauthorized_access', 'Unauthorized Access'),
    )
    
    THREAT_TYPES = (
        ('jamming', 'Communication Jamming'),
        ('gps_spoofing', 'GPS Spoofing'),
        ('atc_access', 'Unauthorized ATC Access'),
        ('data_corruption', 'Data Corruption'),
        ('phishing', 'Phishing'),
        ('ransomware', 'Ransomware'),
        ('dos', 'Denial of Service'),
        ('man_in_middle', 'Man in the Middle'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORIES)
    threat_type = models.CharField(max_length=50, choices=THREAT_TYPES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_LEVELS)
    
    # Scenario content
    initial_state = models.JSONField(help_text="Initial scenario state")
    steps = models.JSONField(help_text="Scenario steps and decision points")
    correct_actions = models.JSONField(help_text="Expected correct actions")
    hints = models.JSONField(default=list, blank=True)
    learning_objectives = models.JSONField(default=list)
    
    # Media
    thumbnail = models.ImageField(upload_to='scenarios/thumbnails/', null=True, blank=True)
    intro_video = models.FileField(upload_to='scenarios/videos/', null=True, blank=True)
    supporting_docs = models.JSONField(default=list, blank=True)
    
    # Metadata
    estimated_time = models.IntegerField(help_text="Estimated time in minutes")
    points_possible = models.IntegerField(default=100)
    passing_score = models.IntegerField(default=70)
    max_attempts = models.IntegerField(default=3)
    version = models.CharField(max_length=10, default='1.0')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    
    # Statistics
    times_completed = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    average_time = models.FloatField(default=0.0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_scenarios')
    
    class Meta:
        db_table = 'scenarios'
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['difficulty']),
            models.Index(fields=['threat_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_featured']),
        ]
        ordering = ['difficulty', 'title']

    def __str__(self):
        return f"{self.title} ({self.difficulty})"
    
    def update_stats(self, score, time_spent):
        self.times_completed += 1
        self.average_score = (self.average_score * (self.times_completed - 1) + score) / self.times_completed
        self.average_time = (self.average_time * (self.times_completed - 1) + time_spent) / self.times_completed
        self.save()


class SimulationSession(models.Model):
    STATUS_CHOICES = (
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('abandoned', 'Abandoned'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='simulation_sessions')
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='sessions')
    
    # Session state
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    current_step = models.IntegerField(default=0)
    session_state = models.JSONField(default=dict)
    decisions = models.JSONField(default=list)
    
    # Performance metrics
    score = models.FloatField(null=True, blank=True)
    time_spent = models.IntegerField(default=0)
    correct_choices = models.IntegerField(default=0)
    total_choices = models.IntegerField(default=0)
    accuracy_rate = models.FloatField(default=0.0)
    hints_used = models.IntegerField(default=0)
    
    # Attempt tracking
    attempt_number = models.IntegerField(default=1)
    passed = models.BooleanField(default=False)
    
    # Feedback
    feedback = models.TextField(blank=True)
    mistakes = models.JSONField(default=list, blank=True)
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'simulation_sessions'
        indexes = [
            models.Index(fields=['user', '-started_at']),
            models.Index(fields=['scenario']),
            models.Index(fields=['status']),
            models.Index(fields=['passed']),
        ]
        unique_together = ['user', 'scenario', 'attempt_number']

    def calculate_accuracy(self):
        if self.total_choices > 0:
            self.accuracy_rate = (self.correct_choices / self.total_choices) * 100
        return self.accuracy_rate
    
    def calculate_score(self):
        base_score = (self.correct_choices / max(self.total_choices, 1)) * 100
        time_penalty = max(0, (self.time_spent - self.scenario.estimated_time * 60) / 60) * 0.5
        hint_penalty = self.hints_used * 2
        final_score = max(0, base_score - time_penalty - hint_penalty)
        self.score = round(final_score, 2)
        self.passed = self.score >= self.scenario.passing_score
        return self.score


class UserDecision(models.Model):
    DECISION_TYPES = (
        ('choice', 'Multiple Choice'),
        ('action', 'Action'),
        ('response', 'Response'),
        ('escalation', 'Escalation'),
    )
    
    session = models.ForeignKey(SimulationSession, on_delete=models.CASCADE, related_name='user_decisions')
    step_number = models.IntegerField()
    decision_type = models.CharField(max_length=20, choices=DECISION_TYPES)
    decision_data = models.JSONField()
    is_correct = models.BooleanField(default=False)
    time_taken = models.IntegerField()
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_decisions'
        indexes = [
            models.Index(fields=['session', 'step_number']),
        ]
        ordering = ['step_number']


class ScenarioFeedback(models.Model):
    RATINGS = (
        (1, 'Poor'),
        (2, 'Fair'),
        (3, 'Good'),
        (4, 'Very Good'),
        (5, 'Excellent'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='feedbacks')
    rating = models.IntegerField(choices=RATINGS)
    difficulty_rating = models.IntegerField(choices=RATINGS)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scenario_feedback'
        unique_together = ['user', 'scenario']


class ScenarioAchievement(models.Model):
    ACHIEVEMENT_TYPES = (
        ('first_completion', 'First Completion'),
        ('perfect_score', 'Perfect Score'),
        ('speed_demon', 'Speed Demon'),
        ('no_hints', 'No Hints Used'),
        ('multiple_attempts', 'Persistent Learner'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scenario_achievements')
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)
    achievement_type = models.CharField(max_length=50, choices=ACHIEVEMENT_TYPES)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scenario_achievements'
        unique_together = ['user', 'scenario', 'achievement_type']


class ScenarioComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'scenario_comments'
        ordering = ['-created_at']


class ScenarioBookmark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scenario_bookmarks')
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scenario_bookmarks'
        unique_together = ['user', 'scenario']