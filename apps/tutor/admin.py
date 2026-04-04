from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    TutorProfile, TeachingMaterial, TeachingSession,
    SessionAttendance, StudentProgress, Exercise, ExerciseAttempt
)

@admin.register(TutorProfile)
class TutorProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user_link', 'experience_years', 'total_students', 
        'total_sessions', 'total_meetings', 'average_rating', 'created_at'
    ]
    list_filter = ['experience_years', 'created_at']
    search_fields = ['user__email', 'user__username', 'bio']
    readonly_fields = ['created_at', 'updated_at', 'user_info']
    fieldsets = (
        ('Tutor Information', {
            'fields': ('user', 'bio', 'qualifications', 'specialization')
        }),
        ('Experience', {
            'fields': ('experience_years',)
        }),
        ('Statistics', {
            'fields': ('total_students', 'total_sessions', 'total_meetings', 'average_rating')
        }),
        ('Meeting Settings', {
            'fields': ('default_meeting_duration', 'default_max_participants',
                      'allow_recording', 'allow_chat', 'allow_screen_share')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{} ({})</a>', url, obj.user.email, obj.user.get_full_name())
    user_link.short_description = 'User'
    
    def user_info(self, obj):
        return format_html(
            '<div style="background:#f8f9fa;padding:10px;">'
            '<strong>Email:</strong> {}<br>'
            '<strong>Name:</strong> {}<br>'
            '<strong>Role:</strong> {}<br>'
            '<strong>Can Create Meetings:</strong> {}'
            '</div>',
            obj.user.email,
            obj.user.get_full_name(),
            obj.user.get_role_display(),
            'Yes' if obj.user.can_create_meeting() else 'No'
        )
    user_info.short_description = 'User Details'


@admin.register(TeachingMaterial)
class TeachingMaterialAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'tutor_link', 'material_type', 'difficulty',
        'is_published_badge', 'views_count', 'average_rating', 'created_at'
    ]
    list_filter = ['material_type', 'difficulty', 'is_published', 'is_featured']
    search_fields = ['title', 'description', 'tutor__user__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'views_count', 'downloads_count', 'average_rating']
    date_hierarchy = 'created_at'
    actions = ['publish_materials', 'unpublish_materials', 'feature_materials']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'description', 'tutor')
        }),
        ('Type & Difficulty', {
            'fields': ('material_type', 'difficulty', 'tags')
        }),
        ('Content', {
            'fields': ('file', 'video_url', 'content', 'duration_minutes')
        }),
        ('Status', {
            'fields': ('is_published', 'is_featured')
        }),
        ('Statistics', {
            'fields': ('views_count', 'downloads_count', 'average_rating')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def tutor_link(self, obj):
        url = reverse('admin:tutor_tutorprofile_change', args=[obj.tutor.id])
        return format_html('<a href="{}">{}</a>', url, obj.tutor.user.email)
    tutor_link.short_description = 'Tutor'
    
    def is_published_badge(self, obj):
        if obj.is_published:
            return format_html('<span style="color:green;font-weight:bold;">✓ Published</span>')
        return format_html('<span style="color:orange;">✗ Draft</span>')
    is_published_badge.short_description = 'Status'
    
    def publish_materials(self, request, queryset):
        updated = queryset.update(is_published=True)
        self.message_user(request, f'{updated} materials published.')
    publish_materials.short_description = "Publish selected materials"
    
    def unpublish_materials(self, request, queryset):
        updated = queryset.update(is_published=False)
        self.message_user(request, f'{updated} materials unpublished.')
    unpublish_materials.short_description = "Unpublish selected materials"
    
    def feature_materials(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} materials featured.')
    feature_materials.short_description = "Feature selected materials"


@admin.register(TeachingSession)
class TeachingSessionAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'tutor_link', 'session_type', 'platform', 'start_time',
        'status_badge', 'current_attendees', 'max_attendees', 'has_meeting'
    ]
    list_filter = ['session_type', 'platform', 'is_cancelled', 'timezone']
    search_fields = ['title', 'description', 'tutor__user__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'current_attendees', 'meeting_link_display']
    date_hierarchy = 'start_time'
    actions = ['cancel_sessions', 'mark_recording_available', 'create_meetings']
    
    fieldsets = (
        ('Session Information', {
            'fields': ('id', 'title', 'description', 'tutor', 'session_type')
        }),
        ('Schedule', {
            'fields': ('start_time', 'end_time', 'timezone')
        }),
        ('Meeting Details', {
            'fields': ('platform', 'meeting_link', 'meeting_id', 'meeting_password')
        }),
        ('Internal Meeting', {
            'fields': ('internal_meeting', 'meeting_link_display')
        }),
        ('Capacity', {
            'fields': ('max_attendees', 'current_attendees')
        }),
        ('Status', {
            'fields': ('is_cancelled', 'cancellation_reason')
        }),
        ('Recording', {
            'fields': ('recording_url', 'recording_available')
        }),
        ('Materials', {
            'fields': ('materials',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def tutor_link(self, obj):
        url = reverse('admin:tutor_tutorprofile_change', args=[obj.tutor.id])
        return format_html('<a href="{}">{}</a>', url, obj.tutor.user.email)
    tutor_link.short_description = 'Tutor'
    
    def status_badge(self, obj):
        now = timezone.now()
        if obj.is_cancelled:
            return format_html('<span style="color:red;font-weight:bold;">✗ Cancelled</span>')
        elif now < obj.start_time:
            return format_html('<span style="color:blue;">⟳ Upcoming</span>')
        elif obj.start_time <= now <= obj.end_time:
            return format_html('<span style="color:green;font-weight:bold;">● Live</span>')
        else:
            return format_html('<span style="color:gray;">✓ Ended</span>')
    status_badge.short_description = 'Status'
    
    def has_meeting(self, obj):
        if obj.internal_meeting:
            url = reverse('admin:meetings_meeting_change', args=[obj.internal_meeting.id])
            return format_html('<a href="{}">View Meeting</a>', url)
        return 'No'
    has_meeting.short_description = 'Meeting'
    
    def meeting_link_display(self, obj):
        if obj.meeting_link:
            return format_html('<a href="{}" target="_blank">{}</a>', obj.meeting_link, obj.meeting_link)
        return '-'
    meeting_link_display.short_description = 'Meeting Link'
    
    def cancel_sessions(self, request, queryset):
        updated = queryset.update(
            is_cancelled=True,
            cancellation_reason='Cancelled by admin'
        )
        self.message_user(request, f'{updated} sessions cancelled.')
    cancel_sessions.short_description = "Cancel selected sessions"
    
    def mark_recording_available(self, request, queryset):
        updated = queryset.update(recording_available=True)
        self.message_user(request, f'{updated} sessions marked as having recording.')
    mark_recording_available.short_description = "Mark recording available"
    
    def create_meetings(self, request, queryset):
        count = 0
        for session in queryset.filter(platform='internal', internal_meeting__isnull=True):
            session.create_internal_meeting()
            count += 1
        self.message_user(request, f'{count} internal meetings created.')
    create_meetings.short_description = "Create internal meetings"


@admin.register(SessionAttendance)
class SessionAttendanceAdmin(admin.ModelAdmin):
    list_display = [
        'session_link', 'student_link', 'joined_at', 
        'left_at', 'duration_minutes', 'rating'
    ]
    list_filter = ['joined_at', 'left_at', 'rating']
    search_fields = ['session__title', 'student__email', 'student__username']
    readonly_fields = ['duration_calculated']
    
    def session_link(self, obj):
        url = reverse('admin:tutor_teachingsession_change', args=[obj.session.id])
        return format_html('<a href="{}">{}</a>', url, obj.session.title)
    session_link.short_description = 'Session'
    
    def student_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.student.id])
        return format_html('<a href="{}">{}</a>', url, obj.student.email)
    student_link.short_description = 'Student'
    
    def duration_minutes(self, obj):
        if obj.duration_seconds:
            return f"{round(obj.duration_seconds / 60, 2)} min"
        return "N/A"
    duration_minutes.short_description = 'Duration'
    
    def duration_calculated(self, obj):
        if obj.joined_at and obj.left_at:
            duration = (obj.left_at - obj.joined_at).total_seconds() / 60
            return f"{round(duration, 2)} minutes"
        return "Not available"
    duration_calculated.short_description = 'Calculated Duration'


@admin.register(StudentProgress)
class StudentProgressAdmin(admin.ModelAdmin):
    list_display = [
        'tutor_link', 'student_link', 'average_score',
        'completed_count', 'meetings_count', 'last_activity', 'updated_at'
    ]
    list_filter = ['last_activity', 'created_at']
    search_fields = ['tutor__user__email', 'student__email']
    readonly_fields = ['created_at', 'updated_at', 'completed_stats']
    actions = ['add_strengths', 'add_improvements']
    
    fieldsets = (
        ('Tutor & Student', {
            'fields': ('tutor', 'student')
        }),
        ('Progress', {
            'fields': ('completed_materials', 'completed_sessions', 'completed_exercises', 'attended_meetings')
        }),
        ('Performance', {
            'fields': ('average_score', 'total_time_spent', 'last_activity')
        }),
        ('Notes & Feedback', {
            'fields': ('tutor_notes', 'strengths', 'areas_for_improvement')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def tutor_link(self, obj):
        url = reverse('admin:tutor_tutorprofile_change', args=[obj.tutor.id])
        return format_html('<a href="{}">{}</a>', url, obj.tutor.user.email)
    tutor_link.short_description = 'Tutor'
    
    def student_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.student.id])
        return format_html('<a href="{}">{}</a>', url, obj.student.email)
    student_link.short_description = 'Student'
    
    def completed_count(self, obj):
        count = len(obj.completed_materials or [])
        count += len(obj.completed_exercises or [])
        count += len(obj.completed_sessions or [])
        return count
    completed_count.short_description = 'Completed Items'
    
    def meetings_count(self, obj):
        return len(obj.attended_meetings or [])
    meetings_count.short_description = 'Meetings Attended'
    
    def completed_stats(self, obj):
        materials = len(obj.completed_materials or [])
        exercises = len(obj.completed_exercises or [])
        sessions = len(obj.completed_sessions or [])
        meetings = len(obj.attended_meetings or [])
        return format_html(
            '<div>Materials: {}<br>Exercises: {}<br>Sessions: {}<br>Meetings: {}</div>',
            materials, exercises, sessions, meetings
        )
    completed_stats.short_description = 'Completion Stats'
    
    def add_strengths(self, request, queryset):
        self.message_user(request, 'Use individual edit to add strengths.')
    add_strengths.short_description = "Add strengths"
    
    def add_improvements(self, request, queryset):
        self.message_user(request, 'Use individual edit to add areas for improvement.')
    add_improvements.short_description = "Add areas for improvement"


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'tutor_link', 'exercise_type', 
        'question_count', 'is_published_badge', 'created_at'
    ]
    list_filter = ['exercise_type', 'is_published', 'created_at']
    search_fields = ['title', 'description', 'tutor__user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    actions = ['publish_exercises', 'unpublish_exercises']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'description', 'tutor', 'exercise_type')
        }),
        ('Content', {
            'fields': ('questions', 'answers', 'explanations')
        }),
        ('Settings', {
            'fields': ('time_limit_minutes', 'passing_score', 'max_attempts')
        }),
        ('Status', {
            'fields': ('is_published',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def tutor_link(self, obj):
        url = reverse('admin:tutor_tutorprofile_change', args=[obj.tutor.id])
        return format_html('<a href="{}">{}</a>', url, obj.tutor.user.email)
    tutor_link.short_description = 'Tutor'
    
    def question_count(self, obj):
        return len(obj.questions) if obj.questions else 0
    question_count.short_description = 'Questions'
    
    def is_published_badge(self, obj):
        if obj.is_published:
            return format_html('<span style="color:green;font-weight:bold;">✓ Published</span>')
        return format_html('<span style="color:orange;">✗ Draft</span>')
    is_published_badge.short_description = 'Status'
    
    def publish_exercises(self, request, queryset):
        updated = queryset.update(is_published=True)
        self.message_user(request, f'{updated} exercises published.')
    publish_exercises.short_description = "Publish selected exercises"
    
    def unpublish_exercises(self, request, queryset):
        updated = queryset.update(is_published=False)
        self.message_user(request, f'{updated} exercises unpublished.')
    unpublish_exercises.short_description = "Unpublish selected exercises"


@admin.register(ExerciseAttempt)
class ExerciseAttemptAdmin(admin.ModelAdmin):
    list_display = [
        'exercise_link', 'student_link', 'score',
        'passed_badge', 'attempt_number', 'completed_at'
    ]
    list_filter = ['passed', 'attempt_number', 'completed_at']
    search_fields = ['exercise__title', 'student__email', 'student__username']
    readonly_fields = ['started_at', 'completed_at']
    date_hierarchy = 'completed_at'
    actions = ['mark_as_passed', 'mark_as_failed']
    
    def exercise_link(self, obj):
        url = reverse('admin:tutor_exercise_change', args=[obj.exercise.id])
        return format_html('<a href="{}">{}</a>', url, obj.exercise.title)
    exercise_link.short_description = 'Exercise'
    
    def student_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.student.id])
        return format_html('<a href="{}">{}</a>', url, obj.student.email)
    student_link.short_description = 'Student'
    
    def passed_badge(self, obj):
        if obj.passed:
            return format_html('<span style="color:green;font-weight:bold;">✓ Passed</span>')
        return format_html('<span style="color:red;">✗ Failed</span>')
    passed_badge.short_description = 'Result'
    
    def mark_as_passed(self, request, queryset):
        updated = queryset.update(passed=True, score=100)
        self.message_user(request, f'{updated} attempts marked as passed.')
    mark_as_passed.short_description = "Mark as passed"
    
    def mark_as_failed(self, request, queryset):
        updated = queryset.update(passed=False, score=0)
        self.message_user(request, f'{updated} attempts marked as failed.')
    mark_as_failed.short_description = "Mark as failed"