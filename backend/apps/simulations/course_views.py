from rest_framework import viewsets, serializers, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .course_service import CourseService
from .models import (
    Course,
    CourseCertificate,
    CourseEnrollment,
    CourseModule,
    ModuleProgress,
)


_UUID_PK = (
    r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
    r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
)

_STAFF_COURSE_ROLES = frozenset({'supervisor', 'admin', 'instructor'})
_STAFF_CERT_ROLES = frozenset({'supervisor', 'admin', 'instructor'})


def _user_role(user):
    return getattr(user, 'role', None) or 'trainee'


class CourseModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModule
        fields = [
            'id', 'title', 'description', 'module_type',
            'position', 'content_body', 'scenario',
            'minimum_passing_score', 'max_simulation_attempts',
        ]


class CourseSerializer(serializers.ModelSerializer):
    modules = CourseModuleSerializer(many=True, read_only=True)
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True)
    module_count = serializers.SerializerMethodField()

    def get_module_count(self, obj):
        return obj.modules.count()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail',
            'threat_focus', 'difficulty', 'is_published',
            'estimated_hours', 'passing_threshold',
            'created_by_username', 'module_count',
            'modules', 'created_at',
        ]


class ModuleProgressSerializer(serializers.ModelSerializer):
    module = CourseModuleSerializer(read_only=True)

    class Meta:
        model = ModuleProgress
        fields = [
            'id', 'module', 'status', 'attempts',
            'best_score', 'passed_at',
        ]


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    module_progresses = ModuleProgressSerializer(many=True, read_only=True)
    current_module = CourseModuleSerializer(read_only=True)
    certificate_number = serializers.SerializerMethodField()

    def get_certificate_number(self, obj):
        try:
            return obj.certificate.certificate_number
        except CourseCertificate.DoesNotExist:
            return None

    class Meta:
        model = CourseEnrollment
        fields = [
            'id', 'course', 'status', 'enrolled_at',
            'completed_at', 'current_module',
            'average_simulation_score', 'module_progresses',
            'certificate_number',
        ]


class CourseCertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(
        source='enrollment.course.title', read_only=True)
    trainee_username = serializers.CharField(
        source='enrollment.trainee.username', read_only=True)

    class Meta:
        model = CourseCertificate
        fields = [
            'id', 'certificate_number', 'course_title',
            'trainee_username', 'final_score', 'issued_at',
        ]


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseSerializer
    queryset = Course.objects.all()
    # Course.pk is a UUID; reject non-UUID paths here so filters never 500.
    lookup_value_regex = _UUID_PK

    def get_queryset(self):
        role = _user_role(self.request.user)
        if role in _STAFF_COURSE_ROLES:
            return Course.objects.prefetch_related('modules').all()
        return Course.objects.filter(
            is_published=True).prefetch_related('modules')

    def perform_create(self, serializer):
        if _user_role(self.request.user) not in _STAFF_COURSE_ROLES:
            raise permissions.PermissionDenied()
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        course = self.get_object()
        user = self.request.user
        role = _user_role(user)
        if role not in _STAFF_COURSE_ROLES:
            raise permissions.PermissionDenied()
        if course.created_by != user and role != 'admin':
            raise permissions.PermissionDenied()
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        role = _user_role(user)
        if role not in _STAFF_COURSE_ROLES:
            raise permissions.PermissionDenied()
        if instance.created_by != user and role != 'admin':
            raise permissions.PermissionDenied()
        instance.delete()

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """POST /courses/{id}/enroll/"""
        service = CourseService()
        try:
            enrollment = service.enroll(pk, request.user)
            return Response(
                CourseEnrollmentSerializer(enrollment).data,
                status=201)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['get'], url_path='enrollments')
    def course_enrollments(self, request, pk=None):
        """GET /courses/{id}/enrollments/ — supervisor view"""
        if _user_role(request.user) not in _STAFF_COURSE_ROLES:
            return Response({'error': 'Forbidden'}, status=403)
        enrollments = CourseEnrollment.objects.filter(
            course_id=pk
        ).select_related('trainee').prefetch_related(
            'module_progresses__module')
        return Response(
            CourseEnrollmentSerializer(enrollments, many=True).data)

    @action(
        detail=True,
        methods=['post'],
        url_path=r'modules/(?P<module_id>[^/.]+)/complete',
    )
    def complete_reading(self, request, pk=None, module_id=None):
        """POST /courses/{id}/modules/{module_id}/complete/"""
        enrollment = CourseEnrollment.objects.filter(
            course_id=pk, trainee=request.user).first()
        if not enrollment:
            return Response({'error': 'Not enrolled'}, status=403)
        service = CourseService()
        try:
            progress = service.mark_reading_complete(
                enrollment.id, module_id, request.user)
            return Response(ModuleProgressSerializer(progress).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['get'], url_path='my-progress')
    def my_progress(self, request, pk=None):
        """GET /courses/{id}/my-progress/"""
        enrollment = CourseEnrollment.objects.select_related(
            'course', 'current_module'
        ).prefetch_related(
            'module_progresses__module'
        ).filter(course_id=pk, trainee=request.user).first()
        if not enrollment:
            return Response({'enrolled': False})
        return Response(CourseEnrollmentSerializer(enrollment).data)

    @action(
        detail=True,
        methods=['post'],
        url_path=r'modules/(?P<module_id>[^/.]+)/reset',
        permission_classes=[permissions.IsAuthenticated],
    )
    def reset_module(self, request, pk=None, module_id=None):
        """POST /courses/{id}/modules/{module_id}/reset/"""
        trainee_id = request.data.get('trainee_id')
        enrollment = CourseEnrollment.objects.filter(
            course_id=pk, trainee_id=trainee_id).first()
        if not enrollment:
            return Response({'error': 'Enrollment not found'}, status=404)
        service = CourseService()
        try:
            progress = service.reset_module_attempts(
                enrollment.id, module_id, request.user)
            return Response(ModuleProgressSerializer(progress).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=403)


class CourseEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Trainees see their own enrollments.
    Supervisors/admins see all enrollments.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseEnrollmentSerializer
    queryset = CourseEnrollment.objects.all()
    lookup_value_regex = _UUID_PK

    def get_queryset(self):
        user = self.request.user
        qs = CourseEnrollment.objects.select_related(
            'course', 'current_module'
        ).prefetch_related(
            'module_progresses__module',
            'certificate',
        )
        if _user_role(user) in _STAFF_COURSE_ROLES:
            return qs.all()
        return qs.filter(trainee=user)


class CourseCertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Trainees see their own certificates.
    Supervisors, instructors, and admins see all.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseCertificateSerializer
    queryset = CourseCertificate.objects.all()
    lookup_value_regex = _UUID_PK

    def get_queryset(self):
        user = self.request.user
        qs = CourseCertificate.objects.select_related(
            'enrollment__course', 'enrollment__trainee')
        if _user_role(user) in _STAFF_CERT_ROLES:
            return qs.all()
        return qs.filter(enrollment__trainee=user)
