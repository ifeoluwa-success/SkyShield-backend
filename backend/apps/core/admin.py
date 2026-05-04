from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    AuditLog, SystemSetting, Notification, NotificationRecipient,
    FileUpload, ErrorLog, APILog
)
import json


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'action_badge', 'app_name', 'model_name', 
                   'object_repr', 'timestamp', 'ip_address']
    list_filter = ['action', 'app_name', 'timestamp']
    search_fields = ['user__email', 'user__username', 'object_repr', 'changes']
    readonly_fields = ['user', 'action', 'app_name', 'model_name', 'object_id',
                      'object_repr', 'changes', 'ip_address', 'user_agent', 'timestamp']
    date_hierarchy = 'timestamp'
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'System'
    user_link.short_description = 'User'
    
    def action_badge(self, obj):
        colors = {
            'CREATE': 'green',
            'UPDATE': 'blue',
            'DELETE': 'red',
            'VIEW': 'gray',
            'LOGIN': 'purple',
            'LOGOUT': 'orange',
        }
        color = colors.get(obj.action, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.action
        )
    action_badge.short_description = 'Action'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'value_preview', 'data_type_badge', 'is_public', 'is_public_badge', 
                   'is_active', 'is_active_badge', 'updated_at']
    list_filter = ['data_type', 'is_public', 'is_active']
    search_fields = ['key', 'description']
    list_editable = ['is_public', 'is_active']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    
    fieldsets = (
        ('Setting Information', {
            'fields': ('key', 'value', 'data_type', 'description')
        }),
        ('Status', {
            'fields': ('is_public', 'is_active')
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def value_preview(self, obj):
        if isinstance(obj.value, (dict, list)):
            return format_html('<pre>{}</pre>', json.dumps(obj.value, indent=2)[:200])
        return str(obj.value)[:100]
    value_preview.short_description = 'Value'
    
    def data_type_badge(self, obj):
        colors = {
            'string': 'blue',
            'integer': 'green',
            'float': 'orange',
            'boolean': 'purple',
            'json': 'red',
            'list': 'brown',
        }
        color = colors.get(obj.data_type, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_data_type_display()
        )
    data_type_badge.short_description = 'Type'
    
    def is_public_badge(self, obj):
        if obj.is_public:
            return format_html('<span style="color:green;">✓ Public</span>')
        return format_html('<span style="color:gray;">✗ Private</span>')
    is_public_badge.short_description = 'Public Status'
    
    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color:green;">✓ Active</span>')
        return format_html('<span style="color:red;">✗ Inactive</span>')
    is_active_badge.short_description = 'Active Status'
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


class NotificationRecipientInline(admin.TabularInline):
    model = NotificationRecipient
    extra = 0
    readonly_fields = ['user', 'is_read', 'read_at', 'created_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'type_badge', 'is_global_badge', 
                   'recipients_count', 'read_count', 'expires_at', 'created_at']
    list_filter = ['notification_type', 'is_global', 'created_at']
    search_fields = ['title', 'message']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 
                      'recipients_count', 'read_count']
    inlines = [NotificationRecipientInline]
    date_hierarchy = 'created_at'
    actions = ['mark_as_global', 'mark_as_private']
    
    fieldsets = (
        ('Notification Information', {
            'fields': ('title', 'message', 'notification_type', 'link')
        }),
        ('Targeting', {
            'fields': ('is_global', 'expires_at')
        }),
        ('Statistics', {
            'fields': ('recipients_count', 'read_count'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def type_badge(self, obj):
        colors = {
            'info': 'blue',
            'success': 'green',
            'warning': 'orange',
            'error': 'red',
            'system': 'purple',
        }
        color = colors.get(obj.notification_type, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_notification_type_display()
        )
    type_badge.short_description = 'Type'
    
    def is_global_badge(self, obj):
        if obj.is_global:
            return format_html('<span style="color:green;">✓ Global</span>')
        return format_html('<span style="color:gray;">✗ Targeted</span>')
    is_global_badge.short_description = 'Scope'
    
    def recipients_count(self, obj):
        if obj.is_global:
            from apps.users.models import User
            return User.objects.filter(is_active=True).count()
        return obj.recipients.count()
    recipients_count.short_description = 'Recipients'
    
    def read_count(self, obj):
        return obj.recipient_records.filter(is_read=True).count()
    read_count.short_description = 'Read'
    
    def mark_as_global(self, request, queryset):
        updated = queryset.update(is_global=True)
        self.message_user(request, f'{updated} notifications marked as global.')
    mark_as_global.short_description = "Mark as global"
    
    def mark_as_private(self, request, queryset):
        updated = queryset.update(is_global=False)
        self.message_user(request, f'{updated} notifications marked as private.')
    mark_as_private.short_description = "Mark as private"
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'file_type_badge', 'file_size_display', 
                   'uploaded_by_link', 'created_at', 'file_link']
    list_filter = ['file_type', 'created_at']
    search_fields = ['file_name', 'uploaded_by__email', 'uploaded_by__username']
    readonly_fields = ['id', 'file', 'file_name', 'file_size', 'file_type', 
                      'mime_type', 'uploaded_by', 'content_type', 'object_id',
                      'created_at', 'updated_at', 'created_by', 'updated_by',
                      'file_preview']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('File Information', {
            'fields': ('id', 'file_name', 'file_size_display', 'file_type', 'mime_type')
        }),
        ('File Preview', {
            'fields': ('file_preview',),
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('uploaded_by', 'created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def file_type_badge(self, obj):
        colors = {
            'image': 'green',
            'document': 'blue',
            'video': 'purple',
            'audio': 'orange',
            'other': 'gray',
        }
        color = colors.get(obj.file_type, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_file_type_display()
        )
    file_type_badge.short_description = 'Type'
    
    def file_size_display(self, obj):
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
    file_size_display.short_description = 'Size'
    
    def uploaded_by_link(self, obj):
        if obj.uploaded_by:
            url = reverse('admin:users_user_change', args=[obj.uploaded_by.id])
            return format_html('<a href="{}">{}</a>', url, obj.uploaded_by.email)
        return 'Anonymous'
    uploaded_by_link.short_description = 'Uploaded By'
    
    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">View File</a>', obj.file.url)
        return '-'
    file_link.short_description = 'File'
    
    def file_preview(self, obj):
        if obj.file and obj.file_type == 'image':
            return format_html('<img src="{}" style="max-width: 300px; max-height: 300px;" />', obj.file.url)
        elif obj.file:
            return format_html('<a href="{}" target="_blank">Click to view file</a>', obj.file.url)
        return 'No file'
    file_preview.short_description = 'Preview'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ['level_badge', 'message_short', 'url', 'method', 
                   'user_link', 'ip_address', 'created_at']
    list_filter = ['level', 'method', 'created_at']
    search_fields = ['message', 'url', 'user__email', 'ip_address']
    readonly_fields = ['level', 'message', 'traceback', 'url', 'method', 
                      'user', 'ip_address', 'user_agent', 'data', 'created_at']
    date_hierarchy = 'created_at'
    
    def level_badge(self, obj):
        colors = {
            'debug': 'blue',
            'info': 'green',
            'warning': 'orange',
            'error': 'red',
            'critical': 'darkred',
        }
        color = colors.get(obj.level, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_level_display()
        )
    level_badge.short_description = 'Level'
    
    def message_short(self, obj):
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    message_short.short_description = 'Message'
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Anonymous'
    user_link.short_description = 'User'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(APILog)
class APILogAdmin(admin.ModelAdmin):
    list_display = ['method', 'path_short', 'response_status_badge', 
                   'user_link', 'execution_time_display', 'timestamp']
    list_filter = ['method', 'response_status', 'timestamp']
    search_fields = ['path', 'user__email', 'ip_address']
    readonly_fields = ['user', 'path', 'method', 'query_params', 'request_body',
                      'response_status', 'response_body', 'ip_address', 'user_agent',
                      'execution_time', 'timestamp']
    date_hierarchy = 'timestamp'
    
    def path_short(self, obj):
        return obj.path[:100] + '...' if len(obj.path) > 100 else obj.path
    path_short.short_description = 'Path'
    
    def response_status_badge(self, obj):
        if 200 <= obj.response_status < 300:
            color = 'green'
        elif 300 <= obj.response_status < 400:
            color = 'blue'
        elif 400 <= obj.response_status < 500:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.response_status
        )
    response_status_badge.short_description = 'Status'
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Anonymous'
    user_link.short_description = 'User'
    
    def execution_time_display(self, obj):
        return f"{obj.execution_time:.2f} ms"
    execution_time_display.short_description = 'Time'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False