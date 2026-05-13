"""
Populate the database with several structured courses, modules, enrollments,
and sample course certificates for API / UI testing.

Usage:
  python manage.py seed_courses
  python manage.py seed_courses --purge          # remove prior [SEED] courses then reseed
  python manage.py seed_courses --password X     # password for demo users if created

Requires migrations for Course / CourseModule / CourseEnrollment / ModuleProgress /
CourseCertificate. Run `python manage.py migrate` if tables are missing.

Demo users (same convention as seed_demo):
  demo.trainee@skyshield.demo
  demo.supervisor@skyshield.demo
Run `python manage.py seed_demo` first if those users do not exist.
"""

import uuid
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.simulations.course_service import CourseService
from apps.simulations.models import (
    Course,
    CourseCertificate,
    CourseEnrollment,
    CourseModule,
    ModuleProgress,
    Scenario,
)

User = get_user_model()

SEED_PREFIX = '[SEED]'

DEMO_DOMAIN = 'skyshield.demo'

COURSE_SPECS = [
    {
        'title': f'{SEED_PREFIX} GPS spoofing response track',
        'threat_focus': 'GPS Spoofing',
        'difficulty': 2,
        'estimated_hours': 4.0,
        'passing_threshold': 72.0,
        'module_count': 6,
        'issue_certificate': True,
    },
    {
        'title': f'{SEED_PREFIX} Ransomware containment playbook',
        'threat_focus': 'Ransomware',
        'difficulty': 3,
        'estimated_hours': 5.5,
        'passing_threshold': 75.0,
        'module_count': 5,
        'issue_certificate': True,
    },
    {
        'title': f'{SEED_PREFIX} Phishing & social engineering defense',
        'threat_focus': 'Phishing',
        'difficulty': 1,
        'estimated_hours': 2.0,
        'passing_threshold': 70.0,
        'module_count': 4,
        'issue_certificate': False,
    },
    {
        'title': f'{SEED_PREFIX} Data integrity for flight ops',
        'threat_focus': 'Data Integrity',
        'difficulty': 2,
        'estimated_hours': 3.0,
        'passing_threshold': 70.0,
        'module_count': 6,
        'issue_certificate': False,
    },
    {
        'title': f'{SEED_PREFIX} Navigation jamming resilience',
        'threat_focus': 'Navigation Jamming',
        'difficulty': 3,
        'estimated_hours': 4.5,
        'passing_threshold': 78.0,
        'module_count': 5,
        'issue_certificate': False,
    },
]


def _minimal_scenario_steps():
    return [
        {
            'title': 'Checkpoint',
            'description': 'Seeded one-step scenario.',
            'step_number': 0,
            'options': [
                {'id': 'ok', 'label': 'Follow procedure'},
                {'id': 'bad', 'label': 'Ignore'},
            ],
            'correct_actions': ['ok'],
            'feedback': {},
        },
    ]


def _ensure_fallback_scenarios(supervisor, minimum=5):
    """Return `minimum` active scenarios (reuse DB + create [SEED] fillers)."""
    pool = list(
        Scenario.objects.filter(is_active=True).order_by('title')[:50]
    )
    filler = 0
    while len(pool) < minimum:
        filler += 1
        s, _ = Scenario.objects.get_or_create(
            title=f'{SEED_PREFIX} Auto scenario {filler}',
            defaults={
                'description': 'Auto-created for seed_courses module linking.',
                'category': 'navigation',
                'threat_type': 'gps_spoofing',
                'difficulty': 'beginner',
                'initial_state': {'seed': True},
                'steps': _minimal_scenario_steps(),
                'correct_actions': ['ok'],
                'hints': [],
                'learning_objectives': ['Procedure'],
                'estimated_time': 5,
                'points_possible': 100,
                'passing_score': 70,
                'max_attempts': 5,
                'created_by': supervisor,
                'is_active': True,
            },
        )
        if not s.is_active:
            s.is_active = True
            s.save(update_fields=['is_active'])
        if s not in pool:
            pool.append(s)
    return pool[:minimum]


class Command(BaseCommand):
    help = 'Seed [SEED] courses with modules, enrollments, and sample certificates.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--purge',
            action='store_true',
            help=f'Delete all courses whose title starts with "{SEED_PREFIX}" then reseed',
        )
        parser.add_argument(
            '--password',
            default='DemoSeed123!',
            help='Password set when creating missing demo users',
        )

    def handle(self, *args, **options):
        password = options['password']

        with transaction.atomic():
            if options['purge']:
                deleted_count, _ = Course.objects.filter(
                    title__startswith=SEED_PREFIX,
                ).delete()
                self.stdout.write(
                    self.style.WARNING(
                        f'Purge: deleted {deleted_count} database rows '
                        f'(courses and cascaded relations).'
                    )
                )

            supervisor = self._get_or_create_demo_user(
                f'demo.supervisor@{DEMO_DOMAIN}',
                'demo_supervisor',
                'supervisor',
                password,
            )
            trainee = self._get_or_create_demo_user(
                f'demo.trainee@{DEMO_DOMAIN}',
                'demo_trainee',
                'trainee',
                password,
            )

            scenarios = _ensure_fallback_scenarios(supervisor, minimum=5)
            svc = CourseService()

            created_courses = []
            for idx, spec in enumerate(COURSE_SPECS):
                course = self._upsert_course(supervisor, spec)
                self._ensure_modules(course, spec['module_count'], scenarios, idx)
                created_courses.append((course, spec))

            enrollments = []
            for course, spec in created_courses:
                enrollment = svc.enroll(course.id, trainee)
                enrollments.append((enrollment, spec))

            for enrollment, spec in enrollments:
                if spec.get('issue_certificate'):
                    self._issue_sample_certificate(enrollment)

        self.stdout.write(self.style.SUCCESS('seed_courses finished.'))
        self.stdout.write(
            f'Courses (title prefix {SEED_PREFIX}): {Course.objects.filter(title__startswith=SEED_PREFIX).count()}'
        )
        self.stdout.write(
            f'Certificates: {CourseCertificate.objects.filter(enrollment__course__title__startswith=SEED_PREFIX).count()}'
        )

    def _get_or_create_demo_user(self, email, username, role, password):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'role': role,
                'first_name': 'Demo',
                'last_name': role.title(),
                'status': 'active',
                'email_verified': True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.NOTICE(f'Created {email}'))
        else:
            user.role = role
            user.status = 'active'
            user.save()
        return user

    def _upsert_course(self, supervisor, spec):
        course, created = Course.objects.update_or_create(
            title=spec['title'],
            defaults={
                'description': (
                    f"Seeded course for {spec['threat_focus']}. "
                    'Safe to delete with --purge.'
                ),
                'threat_focus': spec['threat_focus'],
                'difficulty': spec['difficulty'],
                'created_by': supervisor,
                'is_published': True,
                'estimated_hours': spec['estimated_hours'],
                'passing_threshold': spec['passing_threshold'],
            },
        )
        action = 'Created' if created else 'Updated'
        self.stdout.write(f'{action} course: {course.title}')
        return course

    def _ensure_modules(self, course, module_count, scenarios, course_index):
        """Build 4-6 modules: mix reading and simulation linked to rotating scenarios."""
        existing = set(course.modules.values_list('position', flat=True))
        for pos in range(module_count):
            if pos in existing:
                continue
            is_sim = pos % 2 == 1
            scenario = None
            if is_sim:
                scenario = scenarios[(pos + course_index) % len(scenarios)]
            CourseModule.objects.create(
                course=course,
                position=pos,
                title=(
                    f"Module {pos + 1}: "
                    f"{'Simulation' if is_sim else 'Reading'}"
                ),
                description=f'Position {pos} seeded module.',
                module_type='simulation' if is_sim else 'reading',
                content_body='' if is_sim else f'# Module {pos}\n\nStudy material for **{course.threat_focus}**.',
                scenario=scenario,
                minimum_passing_score=70.0,
                max_simulation_attempts=5,
            )
        self.stdout.write(
            f'  -> {course.modules.count()} modules on {course.title}'
        )

    def _issue_sample_certificate(self, enrollment):
        """Mark all module progress passed and attach a CourseCertificate (dev shortcut)."""
        if CourseCertificate.objects.filter(enrollment=enrollment).exists():
            self.stdout.write(f'  (certificate already exists for {enrollment.id})')
            return

        sim_scores = []
        for mp in enrollment.module_progresses.select_related('module'):
            mp.status = 'passed'
            mp.passed_at = timezone.now()
            if mp.module.module_type == 'simulation':
                score = 82.0 + (hash(str(mp.module_id)) % 7)
                mp.best_score = score
                sim_scores.append(score)
            mp.save(update_fields=['status', 'passed_at', 'best_score'])

        if sim_scores:
            avg = sum(sim_scores) / len(sim_scores)
        else:
            avg = 100.0

        enrollment.average_simulation_score = avg
        enrollment.completed_at = timezone.now()
        enrollment.status = 'certificate_issued'
        last_mod = enrollment.course.modules.order_by('position').last()
        enrollment.current_module = last_mod
        enrollment.save(
            update_fields=[
                'average_simulation_score',
                'completed_at',
                'status',
                'current_module',
            ]
        )

        cert_number = (
            f"SKY-{timezone.now().year}-{str(uuid.uuid4())[:8].upper()}"
        )
        CourseCertificate.objects.create(
            enrollment=enrollment,
            certificate_number=cert_number,
            final_score=avg,
            issued_by=None,
        )
        user = enrollment.trainee
        certs = list(user.certifications or [])
        certs.append({
            'course': enrollment.course.title,
            'certificate_number': cert_number,
            'issued_at': timezone.now().isoformat(),
            'score': avg,
        })
        user.certifications = certs
        user.save(update_fields=['certifications'])
        self.stdout.write(
            self.style.NOTICE(
                f'  Issued certificate {cert_number} for {enrollment.trainee.email}'
            )
        )
