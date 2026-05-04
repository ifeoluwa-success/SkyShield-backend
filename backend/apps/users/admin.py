from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.utils import timezone
from .models import (
    User, UserSession, UserActivity, PasswordResetToken, 
    EmailVerificationToken, TwoFactorBackupCode, UserNotification, UserDevice
)

class CustomUserAdmin(BaseUserAdmin):
    list_display = [
        'email', 'username', 'full_name', 'role_badge', 'status_badge', 
        'email_verified_badge', 'training_level', 'created_at', 'actions_buttons'
    ]
    list_filter = ['role', 'status', 'training_level', 'email_verified', 'is_active', 'is_staff']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'organization']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'last_active', 'deleted_at',
        'total_score', 'simulations_completed', 'average_response_time', 
        'accuracy_rate', 'login_attempts', 'password_changed_at', 'user_info'
    ]
    list_per_page = 25
    date_hierarchy = 'created_at'
    actions = ['verify_emails', 'activate_users', 'deactivate_users', 'make_trainee', 'make_instructor']
    
    fieldsets = (
        ('🔐 Account Authentication', {
            'fields': (
                'id', 'email', 'username', 'password', 
                ('role', 'status'),
                ('email_verified', 'two_factor_enabled'),
                'user_info'
            ),
            'classes': ('wide',)
        }),
        ('👤 Personal Information', {
            'fields': (
                ('first_name', 'last_name'),
                'organization', 'department', 'job_title',
                'phone_number', 'profile_picture', 'bio',
                ('date_of_birth', 'address')
            ),
            'classes': ('wide',)
        }),
        ('📊 Professional & Training', {
            'fields': (
                'employee_id', 'clearance_level', 'certifications',
                'training_level', 
                ('total_score', 'simulations_completed'),
                ('average_response_time', 'accuracy_rate'),
                'weak_areas', 'strong_areas'
            ),
            'classes': ('wide',)
        }),
        ('⚙️ Security & Account Settings', {
            'fields': (
                'email_notifications', 'two_factor_secret',
                ('login_attempts', 'last_login_ip'),
                'account_locked_until', 'password_changed_at',
                ('last_active', 'created_at', 'updated_at'),
                'deleted_at'
            ),
            'classes': ('wide',)
        }),
        ('🔧 Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            ),
            'classes': ('wide',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if not request.user.is_superuser:
            return self.readonly_fields + ['role', 'is_staff', 'is_superuser', 'groups']
        return self.readonly_fields
    
    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = 'Full Name'
    
    def role_badge(self, obj):
        colors = {
            'trainee': 'blue',
            'supervisor': 'purple',
            'admin': 'red',
            'instructor': 'green',
        }
        color = colors.get(obj.role, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 20px; font-weight: bold;">{}</span>',
            color, obj.get_role_display()
        )
    role_badge.short_description = 'Role'
    role_badge.admin_order_field = 'role'
    
    def status_badge(self, obj):
        colors = {
            'active': 'green',
            'inactive': 'gray',
            'suspended': 'red',
            'pending': 'orange',
        }
        color = colors.get(obj.status, 'blue')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 20px; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def email_verified_badge(self, obj):
        if obj.email_verified:
            return format_html('<span style="color: green; font-weight: bold;">✓ Verified</span>')
        return format_html('<span style="color: orange; font-weight: bold;">✗ Unverified</span>')
    email_verified_badge.short_description = 'Email'
    email_verified_badge.admin_order_field = 'email_verified'
    
    def actions_buttons(self, obj):
        buttons = []
        
        if not obj.email_verified:
            url = reverse('admin:verify-user', args=[obj.pk])
            buttons.append(f'<a href="{url}" style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px; text-decoration: none; margin-right: 5px;">✓ Verify</a>')
        
        if obj.is_active:
            url = reverse('admin:deactivate-user', args=[obj.pk])
            buttons.append(f'<a href="{url}" style="background-color: #dc3545; color: white; padding: 3px 10px; border-radius: 3px; text-decoration: none; margin-right: 5px;">🔴 Deactivate</a>')
        else:
            url = reverse('admin:activate-user', args=[obj.pk])
            buttons.append(f'<a href="{url}" style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px; text-decoration: none; margin-right: 5px;">🟢 Activate</a>')
        
        return format_html(''.join(buttons))
    actions_buttons.short_description = 'Quick Actions'
    
    def user_info(self, obj):
        return format_html(
            '<div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px;">'
            '<strong>Created:</strong> {}<br>'
            '<strong>Last Active:</strong> {}<br>'
            '<strong>Login Attempts:</strong> {}<br>'
            '<strong>Account Locked:</strong> {}<br>'
            '<strong>Can Create Meetings:</strong> {}'
            '</div>',
            obj.created_at.strftime("%Y-%m-%d %H:%M") if obj.created_at else 'N/A',
            obj.last_active.strftime("%Y-%m-%d %H:%M") if obj.last_active else 'Never',
            obj.login_attempts,
            obj.account_locked_until if obj.account_locked_until else 'No',
            'Yes' if obj.can_create_meeting() else 'No'
        )
    user_info.short_description = 'User Info'
    
    def verify_emails(self, request, queryset):
        updated = queryset.update(email_verified=True, status='active')
        self.message_user(request, f'{updated} users email verified successfully.')
    verify_emails.short_description = "Verify selected users' emails"
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True, status='active')
        self.message_user(request, f'{updated} users activated successfully.')
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False, status='inactive')
        self.message_user(request, f'{updated} users deactivated successfully.')
    deactivate_users.short_description = "Deactivate selected users"
    
    def make_trainee(self, request, queryset):
        updated = queryset.update(role='trainee')
        self.message_user(request, f'{updated} users role changed to Trainee.')
    make_trainee.short_description = "Change role to Trainee"
    
    def make_instructor(self, request, queryset):
        updated = queryset.update(role='instructor')
        self.message_user(request, f'{updated} users role changed to Instructor.')
    make_instructor.short_description = "Change role to Instructor"
    
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('verify-user/<uuid:user_id>/', self.admin_site.admin_view(self.verify_user), name='verify-user'),
            path('activate-user/<uuid:user_id>/', self.admin_site.admin_view(self.activate_user), name='activate-user'),
            path('deactivate-user/<uuid:user_id>/', self.admin_site.admin_view(self.deactivate_user), name='deactivate-user'),
        ]
        return custom_urls + urls
    
    def verify_user(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.email_verified = True
            user.status = 'active'
            user.save()
            self.message_user(request, f'User {user.email} verified successfully.', messages.SUCCESS)
        except User.DoesNotExist:
            self.message_user(request, 'User not found.', messages.ERROR)
        return HttpResponseRedirect(reverse('admin:users_user_changelist'))
    
    def activate_user(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.is_active = True
            user.status = 'active'
            user.save()
            self.message_user(request, f'User {user.email} activated successfully.', messages.SUCCESS)
        except User.DoesNotExist:
            self.message_user(request, 'User not found.', messages.ERROR)
        return HttpResponseRedirect(reverse('admin:users_user_changelist'))
    
    def deactivate_user(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.is_active = False
            user.status = 'inactive'
            user.save()
            self.message_user(request, f'User {user.email} deactivated successfully.', messages.SUCCESS)
        except User.DoesNotExist:
            self.message_user(request, 'User not found.', messages.ERROR)
        return HttpResponseRedirect(reverse('admin:users_user_changelist'))


admin.site.register(User, CustomUserAdmin)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'session_id_short', 'ip_address', 'login_time', 'last_activity', 'is_active_badge']
    list_filter = ['is_active', 'is_mobile', 'login_time']
    search_fields = ['user__email', 'user__username', 'ip_address', 'session_id']
    readonly_fields = ['session_id', 'login_time', 'last_activity', 'logout_time', 'device_info', 'location']
    date_hierarchy = 'login_time'
    actions = ['terminate_sessions']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def session_id_short(self, obj):
        return f"{obj.session_id[:8]}..."
    session_id_short.short_description = 'Session ID'
    
    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: green; font-weight: bold;">✓ Active</span>')
        return format_html('<span style="color: red; font-weight: bold;">✗ Inactive</span>')
    is_active_badge.short_description = 'Status'
    
    def terminate_sessions(self, request, queryset):
        updated = queryset.update(is_active=False, logout_time=timezone.now())
        self.message_user(request, f'{updated} sessions terminated.')
    terminate_sessions.short_description = "Terminate selected sessions"


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'activity_type_badge', 'timestamp_short', 'ip_address']
    list_filter = ['activity_type', 'timestamp']
    search_fields = ['user__email', 'user__username', 'ip_address', 'metadata']
    readonly_fields = ['user', 'activity_type', 'metadata', 'ip_address', 'user_agent', 'timestamp']
    date_hierarchy = 'timestamp'
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def activity_type_badge(self, obj):
        colors = {
            'login': 'green',
            'logout': 'gray',
            'login_failed': 'red',
            'meeting_created': 'purple',
            'meeting_joined': 'blue',
            'meeting_left': 'orange',
        }
        color = colors.get(obj.activity_type, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_activity_type_display()
        )
    activity_type_badge.short_description = 'Activity'
    
    def timestamp_short(self, obj):
        return obj.timestamp.strftime("%Y-%m-%d %H:%M")
    timestamp_short.short_description = 'Timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'token_short', 'created_at', 'expires_at', 'is_used_badge']
    list_filter = ['is_used', 'created_at', 'expires_at']
    search_fields = ['user__email', 'user__username', 'token']
    readonly_fields = ['token', 'created_at', 'expires_at', 'used_at']
    date_hierarchy = 'created_at'
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def token_short(self, obj):
        return f"{obj.token[:8]}..."
    token_short.short_description = 'Token'
    
    def is_used_badge(self, obj):
        if obj.is_used:
            return format_html('<span style="color: gray;">Used</span>')
        return format_html('<span style="color: green; font-weight: bold;">Active</span>')
    is_used_badge.short_description = 'Status'
    
    def has_add_permission(self, request):
        return False


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'token_short', 'created_at', 'expires_at', 'verified_badge']
    list_filter = ['verified_at', 'created_at', 'expires_at']
    search_fields = ['user__email', 'user__username', 'token']
    readonly_fields = ['token', 'created_at', 'expires_at', 'verified_at']
    date_hierarchy = 'created_at'
    actions = ['mark_as_verified']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def token_short(self, obj):
        return f"{obj.token[:8]}..."
    token_short.short_description = 'Token'
    
    def verified_badge(self, obj):
        if obj.verified_at:
            return format_html('<span style="color: green;">✓ Verified at {}</span>', 
                             obj.verified_at.strftime("%Y-%m-%d %H:%M"))
        return format_html('<span style="color: orange;">⏳ Pending</span>')
    verified_badge.short_description = 'Status'
    
    def mark_as_verified(self, request, queryset):
        updated = queryset.update(verified_at=timezone.now())
        for token in queryset:
            token.user.email_verified = True
            token.user.status = 'active'
            token.user.save()
        self.message_user(request, f'{updated} tokens marked as verified.')
    mark_as_verified.short_description = "Mark selected as verified"
    
    def has_add_permission(self, request):
        return False


@admin.register(TwoFactorBackupCode)
class TwoFactorBackupCodeAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'code', 'is_used_badge', 'used_at']
    list_filter = ['is_used']
    search_fields = ['user__email', 'user__username', 'code']
    readonly_fields = ['code', 'used_at']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def is_used_badge(self, obj):
        if obj.is_used:
            return format_html('<span style="color: gray;">Used</span>')
        return format_html('<span style="color: green;">Available</span>')
    is_used_badge.short_description = 'Status'
    
    def has_add_permission(self, request):
        return False


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'type_badge', 'title_short', 'is_read_badge', 'created_at']
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['user__email', 'user__username', 'title', 'message']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    actions = ['mark_as_read', 'mark_as_unread']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def type_badge(self, obj):
        colors = {
            'info': '#17a2b8',
            'success': '#28a745',
            'warning': '#ffc107',
            'error': '#dc3545',
            'achievement': '#6f42c1',
            'meeting': '#007bff',
            'invitation': '#6610f2',
            'recording': '#e83e8c',
        }
        color = colors.get(obj.type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_type_display()
        )
    type_badge.short_description = 'Type'
    
    def title_short(self, obj):
        return obj.title[:50] + '...' if len(obj.title) > 50 else obj.title
    title_short.short_description = 'Title'
    
    def is_read_badge(self, obj):
        if obj.is_read:
            return format_html('<span style="color: green;">✓ Read</span>')
        return format_html('<span style="color: orange; font-weight: bold;">● Unread</span>')
    is_read_badge.short_description = 'Status'
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notifications marked as read.')
    mark_as_read.short_description = "Mark selected as read"
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} notifications marked as unread.')
    mark_as_unread.short_description = "Mark selected as unread"


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'device_name', 'device_type_badge', 'last_used', 'is_trusted_badge']
    list_filter = ['device_type', 'is_trusted', 'created_at']
    search_fields = ['user__email', 'user__username', 'device_name', 'device_id']
    readonly_fields = ['device_id', 'created_at', 'last_used']
    date_hierarchy = 'created_at'
    actions = ['trust_devices', 'untrust_devices', 'remove_devices']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def device_type_badge(self, obj):
        colors = {
            'mobile': '#17a2b8',
            'tablet': '#28a745',
            'desktop': '#6f42c1',
            'other': '#6c757d',
        }
        color = colors.get(obj.device_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_device_type_display()
        )
    device_type_badge.short_description = 'Type'
    
    def is_trusted_badge(self, obj):
        if obj.is_trusted:
            return format_html('<span style="color: green;">✓ Trusted</span>')
        return format_html('<span style="color: orange;">⚠ Not Trusted</span>')
    is_trusted_badge.short_description = 'Trusted'
    
    def trust_devices(self, request, queryset):
        updated = queryset.update(is_trusted=True)
        self.message_user(request, f'{updated} devices trusted.')
    trust_devices.short_description = "Trust selected devices"
    
    def untrust_devices(self, request, queryset):
        updated = queryset.update(is_trusted=False)
        self.message_user(request, f'{updated} devices untrusted.')
    untrust_devices.short_description = "Untrust selected devices"
    
    def remove_devices(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} devices removed.')
    remove_devices.short_description = "Remove selected devices"