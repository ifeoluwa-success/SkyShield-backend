from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid

class User(AbstractUser):
    ROLE_CHOICES = (
        ('trainee', 'Trainee'),
        ('supervisor', 'Supervisor'),
        ('admin', 'Administrator'),
        ('instructor', 'Instructor'),
    )
    
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('pending', 'Pending Verification'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='trainee')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Personal Information
    organization = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    bio = models.TextField(blank=True, max_length=500)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    
    # Professional Information
    job_title = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    clearance_level = models.CharField(max_length=50, blank=True)
    
    # Training & Certifications
    certifications = models.JSONField(default=list, blank=True)
    training_level = models.CharField(max_length=50, default='Beginner')
    total_score = models.FloatField(default=0.0)
    simulations_completed = models.IntegerField(default=0)
    average_response_time = models.FloatField(default=0.0)
    accuracy_rate = models.FloatField(default=0.0)
    weak_areas = models.JSONField(default=list, blank=True)
    strong_areas = models.JSONField(default=list, blank=True)
    
    # Security & Account Settings
    email_notifications = models.BooleanField(default=True)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=100, blank=True)
    login_attempts = models.IntegerField(default=0)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email', 'status']),
            models.Index(fields=['role']),
            models.Index(fields=['training_level']),
        ]
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        
    def __str__(self):
        return f"{self.email} - {self.role}"
    
    def get_full_name(self):
        """Return the full name of the user"""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    def get_short_name(self):
        """Return the short name of the user"""
        return self.first_name or self.username
    
    def update_score(self, new_score):
        self.total_score = (self.total_score * self.simulations_completed + new_score) / (self.simulations_completed + 1)
        self.simulations_completed += 1
        self.save()
    
    def increment_login_attempts(self):
        self.login_attempts += 1
        if self.login_attempts >= 5:
            self.account_locked_until = timezone.now() + timezone.timedelta(minutes=30)
        self.save()
    
    def reset_login_attempts(self):
        self.login_attempts = 0
        self.account_locked_until = None
        self.save()
    
    def can_create_meeting(self):
        """Check if user can create meetings"""
        return self.role in ['admin', 'supervisor', 'instructor']
    
    def can_join_meeting(self, meeting):
        """Check if user can join a specific meeting"""
        from apps.meetings.models import MeetingParticipant
        if self.role in ['admin', 'supervisor']:
            return True
        if meeting.host == self:
            return True
        return MeetingParticipant.objects.filter(meeting=meeting, user=self).exists()


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_id = models.CharField(max_length=255, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_info = models.JSONField(default=dict)
    location = models.JSONField(default=dict)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_mobile = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['user', '-login_time']),
            models.Index(fields=['session_id']),
        ]
        ordering = ['-login_time']
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
    
    def __str__(self):
        return f"{self.user.email} - {self.login_time}"


class UserActivity(models.Model):
    ACTIVITY_TYPES = (
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('login_failed', 'Login Failed'),
        ('password_change', 'Password Changed'),
        ('password_reset', 'Password Reset'),
        ('email_verify', 'Email Verified'),
        ('profile_update', 'Profile Updated'),
        ('simulation_start', 'Simulation Started'),
        ('simulation_complete', 'Simulation Completed'),
        ('simulation_abandon', 'Simulation Abandoned'),
        ('content_view', 'Content Viewed'),
        ('certificate_earned', 'Certificate Earned'),
        ('achievement_unlocked', 'Achievement Unlocked'),
        ('two_factor_enabled', '2FA Enabled'),
        ('two_factor_disabled', '2FA Disabled'),
        # Meeting activities
        ('meeting_created', 'Meeting Created'),
        ('meeting_joined', 'Meeting Joined'),
        ('meeting_left', 'Meeting Left'),
        ('meeting_ended', 'Meeting Ended'),
        ('screen_shared', 'Screen Shared'),
        ('recording_started', 'Recording Started'),
        ('chat_message', 'Chat Message'),
        ('meeting_invitation_sent', 'Meeting Invitation Sent'),
        ('meeting_invitation_accepted', 'Meeting Invitation Accepted'),
        ('meeting_invitation_declined', 'Meeting Invitation Declined'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_activities'
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['activity_type']),
        ]
        ordering = ['-timestamp']
        verbose_name = 'User Activity'
        verbose_name_plural = 'User Activities'
    
    def __str__(self):
        return f"{self.user.email} - {self.activity_type} - {self.timestamp}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'password_reset_tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', '-created_at']),
        ]
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
    
    def __str__(self):
        return f"{self.user.email} - {self.token[:8]}"
    
    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'email_verification_tokens'
        verbose_name = 'Email Verification Token'
        verbose_name_plural = 'Email Verification Tokens'
    
    def __str__(self):
        return f"{self.user.email} - {self.token[:8]}"
    
    def is_valid(self):
        return not self.verified_at and self.expires_at > timezone.now()


class TwoFactorBackupCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='backup_codes')
    code = models.CharField(max_length=10)
    used_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'two_factor_backup_codes'
        unique_together = ['user', 'code']
        verbose_name = '2FA Backup Code'
        verbose_name_plural = '2FA Backup Codes'
    
    def __str__(self):
        return f"{self.user.email} - {self.code}"


class UserNotification(models.Model):
    NOTIFICATION_TYPES = (
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('success', 'Success'),
        ('error', 'Error'),
        ('achievement', 'Achievement'),
        ('meeting', 'Meeting'),
        ('invitation', 'Meeting Invitation'),
        ('recording', 'Recording Available'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'user_notifications'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read']),
        ]
        ordering = ['-created_at']
        verbose_name = 'User Notification'
        verbose_name_plural = 'User Notifications'
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    def mark_as_read(self):
        self.is_read = True
        self.save()


class UserDevice(models.Model):
    DEVICE_TYPES = (
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('desktop', 'Desktop'),
        ('other', 'Other'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=50, choices=DEVICE_TYPES, default='other')
    push_token = models.CharField(max_length=255, blank=True)
    last_used = models.DateTimeField(auto_now=True)
    is_trusted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_devices'
        unique_together = ['user', 'device_id']
        verbose_name = 'User Device'
        verbose_name_plural = 'User Devices'
    
    def __str__(self):
        return f"{self.user.email} - {self.device_name}"