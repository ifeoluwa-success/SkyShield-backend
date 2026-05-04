from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
import uuid

class BaseModel(models.Model):
    """Abstract base model with common fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='%(class)s_created')
    updated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='%(class)s_updated')
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class AuditLog(BaseModel):
    """Audit log for tracking all important actions"""
    ACTION_TYPES = (
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('EXPORT', 'Export'),
        ('IMPORT', 'Import'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, 
                             null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    app_name = models.CharField(max_length=100)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['app_name', 'model_name']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.action} - {self.app_name}.{self.model_name} at {self.timestamp}"


class SystemSetting(BaseModel):
    """System-wide configuration settings"""
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    data_type = models.CharField(max_length=20, default='string', choices=(
        ('string', 'String'),
        ('integer', 'Integer'),
        ('float', 'Float'),
        ('boolean', 'Boolean'),
        ('json', 'JSON'),
        ('list', 'List'),
    ))
    
    class Meta:
        db_table = 'system_settings'
        indexes = [
            models.Index(fields=['key']),
        ]
    
    def __str__(self):
        return f"{self.key}: {self.value}"


class Notification(BaseModel):
    """System notifications"""
    NOTIFICATION_TYPES = (
        ('info', 'Information'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('system', 'System'),
    )
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    # Changed related_name from 'notifications' to 'system_notifications' to avoid conflict
    recipients = models.ManyToManyField('users.User', through='NotificationRecipient', 
                                        related_name='system_notifications')
    link = models.CharField(max_length=500, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_global = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['notification_type']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class NotificationRecipient(models.Model):
    """Through model for notification recipients"""
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='recipient_records')
    # Changed related_name from 'notification_records' to 'notification_recipients' for clarity
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notification_recipients')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_recipients'
        unique_together = ['notification', 'user']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read']),
            models.Index(fields=['notification', 'is_read']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user} - {self.notification.title}"


class FileUpload(BaseModel):
    """Track file uploads"""
    FILE_TYPES = (
        ('image', 'Image'),
        ('document', 'Document'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('other', 'Other'),
    )
    
    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, 
                                    null=True, related_name='file_uploads')
    
    # For generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    class Meta:
        db_table = 'file_uploads'
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['file_type']),
            models.Index(fields=['uploaded_by', '-created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return self.file_name
    
    def delete(self, *args, **kwargs):
        if self.file:
            storage = self.file.storage
            if storage.exists(self.file.name):
                storage.delete(self.file.name)
        super().delete(*args, **kwargs)


class ErrorLog(models.Model):
    """Track application errors"""
    ERROR_LEVELS = (
        ('debug', 'Debug'),
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    )
    
    level = models.CharField(max_length=20, choices=ERROR_LEVELS, default='error')
    message = models.TextField()
    traceback = models.TextField(blank=True)
    url = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'error_logs'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['level']),
            models.Index(fields=['level', '-created_at']),
            models.Index(fields=['url']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.level}: {self.message[:50]}"


class APILog(models.Model):
    """Track API requests"""
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    path = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    query_params = models.JSONField(default=dict)
    request_body = models.JSONField(default=dict)
    response_status = models.IntegerField()
    response_body = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    execution_time = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'api_logs'
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['path']),
            models.Index(fields=['response_status']),
            models.Index(fields=['method']),
            models.Index(fields=['path', 'method']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.method} {self.path} - {self.response_status}"