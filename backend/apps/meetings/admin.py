from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    Meeting, MeetingParticipant, MeetingInvitation, 
    MeetingRecording, MeetingChat
)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'meeting_code', 'host_link', 'meeting_type',
        'status_badge', 'scheduled_start', 'participant_count',
        'max_participants', 'created_at'
    ]
    list_filter = ['status', 'meeting_type', 'is_private', 'created_at']
    search_fields = ['title', 'description', 'meeting_code', 'host__email']
    readonly_fields = [
        'id', 'meeting_code', 'room_name', 'actual_start', 'actual_end',
        'participant_count', 'peak_participants', 'duration_seconds',
        'created_at', 'updated_at', 'meeting_link'
    ]
    date_hierarchy = 'scheduled_start'
    actions = ['start_meetings', 'end_meetings', 'cancel_meetings']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'id', 'title', 'description', 'meeting_code', 'room_name',
                'host', 'tutor_profile', 'meeting_link'
            )
        }),
        ('Schedule', {
            'fields': (
                'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
                'duration_seconds', 'timezone'
            )
        }),
        ('Status & Type', {
            'fields': ('status', 'meeting_type', 'is_private')
        }),
        ('Capacity', {
            'fields': ('max_participants', 'participant_count', 'peak_participants')
        }),
        ('Security', {
            'fields': ('password', 'waiting_room_enabled', 'lock_on_start',
                      'require_host_to_start')
        }),
        ('Features', {
            'fields': ('allow_recording', 'allow_chat', 'allow_screen_share')
        }),
        ('Recording', {
            'fields': ('recording_url', 'recording_available')
        }),
        ('Metadata', {
            'fields': ('settings', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def host_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.host.id])
        return format_html('<a href="{}">{}</a>', url, obj.host.email)
    host_link.short_description = 'Host'
    
    def status_badge(self, obj):
        colors = {
            'scheduled': 'blue',
            'live': 'green',
            'ended': 'gray',
            'cancelled': 'red',
            'recorded': 'purple',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 20px; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def meeting_link(self, obj):
        if obj.id:
            url = reverse('meeting-detail', args=[obj.id])
            return format_html('<a href="{}" target="_blank">View in Platform</a>', url)
        return '-'
    meeting_link.short_description = 'Platform Link'
    
    def start_meetings(self, request, queryset):
        for meeting in queryset.filter(status='scheduled'):
            meeting.start_meeting()
        self.message_user(request, f'{queryset.count()} meetings started.')
    start_meetings.short_description = "Start selected meetings"
    
    def end_meetings(self, request, queryset):
        for meeting in queryset.filter(status='live'):
            meeting.end_meeting()
        self.message_user(request, f'{queryset.count()} meetings ended.')
    end_meetings.short_description = "End selected meetings"
    
    def cancel_meetings(self, request, queryset):
        updated = queryset.update(
            status='cancelled',
            actual_end=timezone.now()
        )
        self.message_user(request, f'{updated} meetings cancelled.')
    cancel_meetings.short_description = "Cancel selected meetings"


@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):
    list_display = [
        'user_link', 'meeting_link', 'role_badge', 'status_badge',
        'joined_at', 'left_at', 'media_status'
    ]
    list_filter = ['role', 'status', 'is_active', 'video_enabled', 'audio_enabled']
    search_fields = ['user__email', 'user__username', 'meeting__title', 'meeting__meeting_code']
    readonly_fields = ['id', 'channel_name', 'session_id', 'peer_id', 'joined_at', 'left_at', 'last_heartbeat']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def meeting_link(self, obj):
        url = reverse('admin:meetings_meeting_change', args=[obj.meeting.id])
        return format_html('<a href="{}">{}</a>', url, obj.meeting.title)
    meeting_link.short_description = 'Meeting'
    
    def role_badge(self, obj):
        colors = {
            'host': 'red',
            'co_host': 'orange',
            'participant': 'blue',
            'observer': 'gray',
        }
        color = colors.get(obj.role, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_role_display()
        )
    role_badge.short_description = 'Role'
    
    def status_badge(self, obj):
        colors = {
            'invited': 'blue',
            'waiting': 'orange',
            'joining': 'purple',
            'connected': 'green',
            'disconnected': 'gray',
            'rejected': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def media_status(self, obj):
        icons = []
        if obj.video_enabled:
            icons.append('🎥')
        if obj.audio_enabled:
            icons.append('🎤')
        if obj.screen_sharing:
            icons.append('🖥️')
        if obj.hand_raised:
            icons.append('✋')
        return ' '.join(icons) or '-'
    media_status.short_description = 'Media'


@admin.register(MeetingInvitation)
class MeetingInvitationAdmin(admin.ModelAdmin):
    list_display = [
        'meeting_link', 'invited_user_link', 'invited_by_link',
        'status_badge', 'expires_at', 'created_at'
    ]
    list_filter = ['status', 'email_sent', 'notification_sent', 'created_at']
    search_fields = ['meeting__title', 'invited_user__email', 'invited_by__email']
    readonly_fields = ['token', 'responded_at', 'created_at']
    date_hierarchy = 'created_at'
    actions = ['resend_invitations']
    
    def meeting_link(self, obj):
        url = reverse('admin:meetings_meeting_change', args=[obj.meeting.id])
        return format_html('<a href="{}">{}</a>', url, obj.meeting.title)
    meeting_link.short_description = 'Meeting'
    
    def invited_user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.invited_user.id])
        return format_html('<a href="{}">{}</a>', url, obj.invited_user.email)
    invited_user_link.short_description = 'Invited User'
    
    def invited_by_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.invited_by.id])
        return format_html('<a href="{}">{}</a>', url, obj.invited_by.email)
    invited_by_link.short_description = 'Invited By'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'accepted': 'green',
            'declined': 'red',
            'expired': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def resend_invitations(self, request, queryset):
        updated = queryset.update(email_sent=False, notification_sent=False)
        self.message_user(request, f'{updated} invitations marked for resend.')
    resend_invitations.short_description = "Resend selected invitations"


@admin.register(MeetingRecording)
class MeetingRecordingAdmin(admin.ModelAdmin):
    list_display = [
        'meeting_link', 'requested_by_link', 'status_badge',
        'file_size_display', 'duration_display', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['meeting__title', 'meeting__meeting_code', 'requested_by__email']
    readonly_fields = ['id', 'task_id', 'started_at', 'completed_at', 'created_at']
    actions = ['process_recordings', 'retry_failed']
    
    def meeting_link(self, obj):
        url = reverse('admin:meetings_meeting_change', args=[obj.meeting.id])
        return format_html('<a href="{}">{}</a>', url, obj.meeting.title)
    meeting_link.short_description = 'Meeting'
    
    def requested_by_link(self, obj):
        if obj.requested_by:
            url = reverse('admin:users_user_change', args=[obj.requested_by.id])
            return format_html('<a href="{}">{}</a>', url, obj.requested_by.email)
        return '-'
    requested_by_link.short_description = 'Requested By'
    
    def status_badge(self, obj):
        colors = {
            'requested': 'orange',
            'processing': 'blue',
            'completed': 'green',
            'failed': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def file_size_display(self, obj):
        if obj.file_size:
            for unit in ['B', 'KB', 'MB', 'GB']:
                if obj.file_size < 1024.0:
                    return f"{obj.file_size:.1f} {unit}"
                obj.file_size /= 1024.0
        return '-'
    file_size_display.short_description = 'File Size'
    
    def duration_display(self, obj):
        if obj.duration_seconds:
            minutes = obj.duration_seconds // 60
            seconds = obj.duration_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return '-'
    duration_display.short_description = 'Duration'
    
    def process_recordings(self, request, queryset):
        for recording in queryset.filter(status='requested'):
            recording.status = 'processing'
            recording.save()
        self.message_user(request, f'{queryset.count()} recordings processing.')
    process_recordings.short_description = "Process selected recordings"
    
    def retry_failed(self, request, queryset):
        updated = queryset.filter(status='failed').update(status='requested')
        self.message_user(request, f'{updated} recordings queued for retry.')
    retry_failed.short_description = "Retry failed recordings"


@admin.register(MeetingChat)
class MeetingChatAdmin(admin.ModelAdmin):
    list_display = ['meeting_link', 'sender_link', 'recipient_link', 'message_type', 
                   'content_short', 'created_at']
    list_filter = ['message_type', 'is_edited', 'is_deleted', 'created_at']
    search_fields = ['content', 'sender__email', 'recipient__email', 'meeting__title']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'
    
    def meeting_link(self, obj):
        url = reverse('admin:meetings_meeting_change', args=[obj.meeting.id])
        return format_html('<a href="{}">{}</a>', url, obj.meeting.title)
    meeting_link.short_description = 'Meeting'
    
    def sender_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.sender.id])
        return format_html('<a href="{}">{}</a>', url, obj.sender.email)
    sender_link.short_description = 'Sender'
    
    def recipient_link(self, obj):
        if obj.recipient:
            url = reverse('admin:users_user_change', args=[obj.recipient.id])
            return format_html('<a href="{}">{}</a>', url, obj.recipient.email)
        return 'Everyone'
    recipient_link.short_description = 'Recipient'
    
    def content_short(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = 'Message'