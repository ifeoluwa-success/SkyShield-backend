from rest_framework import serializers
from django.apps import apps
from .models import (
    TutorProfile, TeachingMaterial, TeachingSession,
    SessionAttendance, StudentProgress, Exercise, ExerciseAttempt
)

# Lazy loader for UserProfileSerializer to avoid circular imports
def get_user_profile_serializer():
    """Dynamically get UserProfileSerializer to avoid circular imports"""
    User = apps.get_model('users', 'User')
    
    # Define the serializer dynamically
    class DynamicUserProfileSerializer(serializers.ModelSerializer):
        full_name = serializers.SerializerMethodField()
        
        class Meta:
            model = User
            fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name',
                     'role', 'profile_picture', 'organization', 'department']
        
        def get_full_name(self, obj):
            return f"{obj.first_name} {obj.last_name}".strip()
    
    return DynamicUserProfileSerializer


class TutorProfileSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = TutorProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_user(self, obj):
        """Lazy load user data"""
        UserProfileSerializer = get_user_profile_serializer()
        return UserProfileSerializer(obj.user).data


class TeachingMaterialSerializer(serializers.ModelSerializer):
    tutor_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TeachingMaterial
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'views_count', 
                           'downloads_count', 'average_rating']
    
    def get_tutor_name(self, obj):
        return obj.tutor.user.get_full_name() or obj.tutor.user.username
    
    def get_file_url(self, obj):
        """Get absolute URL for file if exists"""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class TeachingSessionSerializer(serializers.ModelSerializer):
    tutor_name = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    meeting_details = serializers.SerializerMethodField()
    
    class Meta:
        model = TeachingSession
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_attendees']
    
    def get_tutor_name(self, obj):
        return obj.tutor.user.get_full_name() or obj.tutor.user.username
    
    def get_is_full(self, obj):
        return obj.current_attendees >= obj.max_attendees
    
    def get_status(self, obj):
        from django.utils import timezone
        now = timezone.now()
        
        if obj.is_cancelled:
            return 'cancelled'
        elif now < obj.start_time:
            return 'upcoming'
        elif obj.start_time <= now <= obj.end_time:
            return 'live'
        else:
            return 'ended'
    
    def get_meeting_details(self, obj):
        """Return meeting details only for enrolled/authorized users"""
        request = self.context.get('request')
        if request and (request.user == obj.tutor.user or request.user.role in ['admin', 'supervisor']):
            return {
                'link': obj.meeting_link,
                'id': obj.meeting_id,
                'password': obj.meeting_password
            }
        return None


class SessionAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    attendance_duration = serializers.SerializerMethodField()
    
    class Meta:
        model = SessionAttendance
        fields = '__all__'
        read_only_fields = ['id']
    
    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username
    
    def get_student_email(self, obj):
        return obj.student.email
    
    def get_attendance_duration(self, obj):
        """Calculate attendance duration in minutes"""
        if obj.joined_at and obj.left_at:
            duration = (obj.left_at - obj.joined_at).total_seconds() / 60
            return round(duration, 2)
        return obj.duration_seconds / 60 if obj.duration_seconds else 0


class StudentProgressSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentProgress
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_student(self, obj):
        """Lazy load student data"""
        UserProfileSerializer = get_user_profile_serializer()
        return UserProfileSerializer(obj.student).data
    
    def get_progress_percentage(self, obj):
        """Calculate overall progress percentage"""
        total_items = len(obj.completed_materials) + len(obj.completed_exercises) if obj.completed_materials and obj.completed_exercises else 0
        # You can customize this based on your requirements
        return min(total_items * 10, 100) if total_items > 0 else 0


class ExerciseSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_question_count(self, obj):
        """Return number of questions in exercise"""
        return len(obj.questions) if obj.questions else 0


class ExerciseAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    exercise_title = serializers.SerializerMethodField()
    time_taken_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = ExerciseAttempt
        fields = '__all__'
        read_only_fields = ['id', 'started_at']
    
    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username
    
    def get_student_email(self, obj):
        return obj.student.email
    
    def get_exercise_title(self, obj):
        return obj.exercise.title
    
    def get_time_taken_minutes(self, obj):
        """Convert time taken to minutes"""
        return round(obj.time_taken / 60, 2) if obj.time_taken else 0


class TutorDashboardStatsSerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    total_materials = serializers.IntegerField()
    total_exercises = serializers.IntegerField()
    upcoming_sessions = serializers.IntegerField()
    recent_uploads = TeachingMaterialSerializer(many=True)
    upcoming_sessions_list = TeachingSessionSerializer(many=True)
    student_performance = serializers.ListField(child=serializers.DictField())


class TeachingMaterialDetailSerializer(TeachingMaterialSerializer):
    """Extended serializer with additional fields for detail view"""
    is_owner = serializers.SerializerMethodField()
    download_count = serializers.IntegerField(source='downloads_count', read_only=True)
    
    class Meta(TeachingMaterialSerializer.Meta):
        fields = TeachingMaterialSerializer.Meta.fields + ['is_owner', 'download_count']
    
    def get_is_owner(self, obj):
        """Check if current user is the owner"""
        request = self.context.get('request')
        if request:
            return obj.tutor.user == request.user
        return False


class TeachingSessionDetailSerializer(TeachingSessionSerializer):
    """Extended serializer with additional fields for detail view"""
    attendees = serializers.SerializerMethodField()
    attendance_rate = serializers.SerializerMethodField()
    
    class Meta(TeachingSessionSerializer.Meta):
        fields = TeachingSessionSerializer.Meta.fields + ['attendees', 'attendance_rate']
    
    def get_attendees(self, obj):
        """Get list of attendees"""
        attendances = obj.attendances.select_related('student').all()
        return [{
            'student_id': str(a.student.id),
            'student_name': a.student.get_full_name() or a.student.username,
            'joined_at': a.joined_at,
            'duration': a.duration_seconds
        } for a in attendances]
    
    def get_attendance_rate(self, obj):
        """Calculate attendance rate"""
        if obj.max_attendees > 0:
            return round((obj.current_attendees / obj.max_attendees) * 100, 2)
        return 0


class ExerciseDetailSerializer(ExerciseSerializer):
    """Extended serializer with additional fields for detail view"""
    attempts_count = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()
    pass_rate = serializers.SerializerMethodField()
    
    class Meta(ExerciseSerializer.Meta):
        fields = ExerciseSerializer.Meta.fields + ['attempts_count', 'average_score', 'pass_rate']
    
    def get_attempts_count(self, obj):
        """Get total number of attempts"""
        return obj.attempts.count()
    
    def get_average_score(self, obj):
        """Calculate average score across all attempts"""
        attempts = obj.attempts.all()
        if attempts:
            return round(sum(a.score for a in attempts) / len(attempts), 2)
        return 0
    
    def get_pass_rate(self, obj):
        """Calculate pass rate percentage"""
        attempts = obj.attempts.all()
        if attempts:
            passed = sum(1 for a in attempts if a.passed)
            return round((passed / len(attempts)) * 100, 2)
        return 0