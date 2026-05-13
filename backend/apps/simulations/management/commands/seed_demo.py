"""
Load demo users, scenarios, published courses, and optional enrollment
for local API testing.

Usage:
  python manage.py seed_demo
  python manage.py seed_demo --password YourSecret123!
  python manage.py seed_demo --reset-password
  python manage.py seed_demo --no-enroll
  python manage.py seed_demo --complete-reading

Demo accounts (email / username):
  demo.trainee@skyshield.demo       demo_trainee      (trainee)
  demo.supervisor@skyshield.demo    demo_supervisor   (supervisor)
  demo.admin@skyshield.demo         demo_admin        (admin)

Re-running is safe: existing demo rows are reused (same emails / titles).
Enrollment uses CourseService.enroll (idempotent).
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.simulations.course_service import CourseService
from apps.simulations.models import (
    Course,
    CourseModule,
    Scenario,
)

User = get_user_model()

DEMO_EMAIL_DOMAIN = 'skyshield.demo'
SCENARIO_TITLE = '[DEMO] GPS spoofing checkpoint'
COURSE_TITLE = '[DEMO] SkyShield intro course'
READING_ONLY_COURSE_TITLE = '[DEMO] Reading-only quick course'


def _demo_steps_single_choice():
    """One-step scenario: completes on first correct submit_decision."""
    return [
        {
            'title': 'Detect the anomaly',
            'description': 'You notice unusual navigation indications. What do you do?',
            'step_number': 0,
            'options': [
                {'id': 'report', 'label': 'Report to ATC per protocol'},
                {'id': 'ignore', 'label': 'Ignore and continue'},
            ],
            'correct_actions': ['report'],
            'feedback': {'success': 'Good — escalate early.'},
        },
    ]


class Command(BaseCommand):
    help = (
        'Seed demo users, scenarios, published courses, and optionally '
        'enroll the demo trainee via CourseService.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            default='DemoSeed123!',
            help='Password for all demo users (default: DemoSeed123!)',
        )
        parser.add_argument(
            '--reset-password',
            action='store_true',
            help='For existing demo users, overwrite password with --password',
        )
        parser.add_argument(
            '--no-enroll',
            action='store_true',
            help='Skip enrolling demo.trainee in demo courses',
        )
        parser.add_argument(
            '--complete-reading',
            action='store_true',
            help=(
                'After enroll, mark the first reading module passed on the '
                'intro course (unlocks simulation checkpoint)'
            ),
        )

    def handle(self, *args, **options):
        password = options['password']
        reset_password = options['reset_password']

        with transaction.atomic():
            trainee = self._upsert_user(
                email=f'demo.trainee@{DEMO_EMAIL_DOMAIN}',
                username='demo_trainee',
                role='trainee',
                first_name='Demo',
                last_name='Trainee',
                password=password,
                reset_password=reset_password,
            )
            supervisor = self._upsert_user(
                email=f'demo.supervisor@{DEMO_EMAIL_DOMAIN}',
                username='demo_supervisor',
                role='supervisor',
                first_name='Demo',
                last_name='Supervisor',
                password=password,
                reset_password=reset_password,
            )
            admin = self._upsert_user(
                email=f'demo.admin@{DEMO_EMAIL_DOMAIN}',
                username='demo_admin',
                role='admin',
                first_name='Demo',
                last_name='Admin',
                password=password,
                reset_password=reset_password,
            )

            scenario = self._upsert_scenario(supervisor)
            course = self._upsert_course(supervisor, scenario)
            reading_course = self._upsert_reading_only_course(supervisor)

            enrollments = {}
            if not options['no_enroll']:
                svc = CourseService()
                enrollments['intro'] = svc.enroll(course.id, trainee)
                enrollments['reading_only'] = svc.enroll(
                    reading_course.id, trainee)
                self.stdout.write(
                    self.style.NOTICE(
                        'Enrolled demo.trainee in intro + reading-only courses'
                    )
                )
                if options['complete_reading']:
                    first_reading = (
                        course.modules.filter(
                            module_type='reading'
                        ).order_by('position').first()
                    )
                    if first_reading:
                        svc.mark_reading_complete(
                            enrollments['intro'].id,
                            first_reading.id,
                            trainee,
                        )
                        self.stdout.write(
                            self.style.NOTICE(
                                'Marked intro course reading module complete '
                                '(simulation module unlocked)'
                            )
                        )

        self.stdout.write(self.style.SUCCESS('Demo seed complete.\n'))
        self.stdout.write('Login (email -> password):\n')
        self.stdout.write(
            f'  {trainee.email} / {password}\n'
            f'  {supervisor.email} / {password}\n'
            f'  {admin.email} / {password}\n'
        )
        self.stdout.write('\nIDs:\n')
        self.stdout.write(f'  Scenario:       {scenario.id}\n')
        self.stdout.write(f'  Course (intro): {course.id}\n')
        self.stdout.write(
            f'  Course (read):  {reading_course.id}\n'
        )
        if enrollments:
            self.stdout.write(
                f'  Enrollment intro:        {enrollments["intro"].id}\n'
            )
            self.stdout.write(
                f'  Enrollment reading-only: '
                f'{enrollments["reading_only"].id}\n'
            )
        note = (
            '\nPassword hint: new demo users use --password. '
            'Existing users keep their password unless you pass --reset-password.\n'
        )
        self.stdout.write(note)
        if options['no_enroll']:
            self.stdout.write(
                '\nEnroll skipped. Use POST '
                '/api/simulations/courses/{course_id}/enroll/ as trainee.\n'
            )
        else:
            self.stdout.write(
                '\nTrainee is enrolled. GET my-progress:\n'
                f'  /api/simulations/courses/{course.id}/my-progress/\n'
            )
            if not options['complete_reading']:
                self.stdout.write(
                    '  Re-run with --complete-reading to pass the first '
                    'reading module on the intro course.\n'
                )

    def _upsert_user(
        self,
        *,
        email,
        username,
        role,
        first_name,
        last_name,
        password,
        reset_password,
    ):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'role': role,
                'first_name': first_name,
                'last_name': last_name,
                'status': 'active',
                'email_verified': True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.NOTICE(f'Created user {email}'))
        else:
            user.role = role
            user.status = 'active'
            if reset_password:
                user.set_password(password)
            user.save()
            msg = f'Demo user exists: {email}'
            if reset_password:
                msg += ' (password reset)'
            self.stdout.write(self.style.WARNING(msg))

        return user

    def _upsert_scenario(self, creator: User) -> Scenario:
        steps = _demo_steps_single_choice()
        scenario, created = Scenario.objects.get_or_create(
            title=SCENARIO_TITLE,
            defaults={
                'description': 'Minimal one-step demo for submit_decision flow.',
                'category': 'navigation',
                'threat_type': 'gps_spoofing',
                'difficulty': 'beginner',
                'initial_state': {'phase': 'cruise'},
                'steps': steps,
                'correct_actions': ['report'],
                'hints': [],
                'learning_objectives': ['Recognize GPS spoofing indicators'],
                'graph': {},
                'escalation_rules': [],
                'estimated_time': 5,
                'points_possible': 100,
                'passing_score': 70,
                'max_attempts': 5,
                'is_active': True,
                'is_featured': False,
                'created_by': creator,
            },
        )
        if created:
            self.stdout.write(self.style.NOTICE(f'Created scenario "{scenario.title}"'))
        else:
            self.stdout.write(self.style.WARNING(f'Scenario exists: {scenario.title}'))

        return scenario

    def _upsert_course(self, creator: User, scenario: Scenario) -> Course:
        course, created = Course.objects.get_or_create(
            title=COURSE_TITLE,
            defaults={
                'description': 'Reading module then simulation checkpoint linked to the demo scenario.',
                'threat_focus': 'GPS Spoofing',
                'difficulty': 1,
                'created_by': creator,
                'is_published': True,
                'estimated_hours': 1.0,
                'passing_threshold': 70.0,
            },
        )
        if created:
            self.stdout.write(self.style.NOTICE(f'Created course "{course.title}"'))
        else:
            self.stdout.write(self.style.WARNING(f'Course exists: {course.title}'))

        CourseModule.objects.get_or_create(
            course=course,
            position=0,
            defaults={
                'title': 'Briefing: spoofing awareness',
                'description': 'Read this before the checkpoint.',
                'module_type': 'reading',
                'content_body': '# Demo briefing\n\nAlways verify nav sources.',
            },
        )
        CourseModule.objects.get_or_create(
            course=course,
            position=1,
            defaults={
                'title': 'Simulation checkpoint',
                'description': 'Pass the linked scenario to continue.',
                'module_type': 'simulation',
                'scenario': scenario,
                'minimum_passing_score': 70.0,
                'max_simulation_attempts': 5,
            },
        )

        return course

    def _upsert_reading_only_course(self, creator: User) -> Course:
        """Single reading module; good for certificate / completion smoke tests."""
        course, created = Course.objects.get_or_create(
            title=READING_ONLY_COURSE_TITLE,
            defaults={
                'description': 'One reading module only; complete via mark complete.',
                'threat_focus': 'General awareness',
                'difficulty': 1,
                'created_by': creator,
                'is_published': True,
                'estimated_hours': 0.25,
                'passing_threshold': 70.0,
            },
        )
        if created:
            self.stdout.write(
                self.style.NOTICE(f'Created course "{course.title}"')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Course exists: {course.title}')
            )

        CourseModule.objects.get_or_create(
            course=course,
            position=0,
            defaults={
                'title': 'Quick policy read',
                'description': 'Short reading checkpoint.',
                'module_type': 'reading',
                'content_body': '# Policy\n\nReport anomalies immediately.',
            },
        )
        return course
