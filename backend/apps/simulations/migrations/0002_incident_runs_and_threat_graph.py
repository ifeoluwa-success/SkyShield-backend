# Generated manually (equivalent to makemigrations) on 2026-05-13

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('simulations', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='scenario',
            name='graph',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='scenario',
            name='escalation_rules',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='scenario',
            name='is_genie_generated',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='scenario',
            name='genie_template_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.CreateModel(
            name='IncidentRun',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('phase', models.CharField(choices=[('briefing', 'Briefing'), ('detection', 'Detection'), ('investigation', 'Investigation'), ('containment', 'Containment'), ('recovery', 'Recovery'), ('review', 'Review')], default='briefing', max_length=20)),
                ('status', models.CharField(choices=[('not_started', 'Not Started'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('failed', 'Failed'), ('abandoned', 'Abandoned'), ('paused', 'Paused')], default='not_started', max_length=20)),
                ('session_state', models.JSONField(default=dict)),
                ('phase_started_at', models.DateTimeField(blank=True, null=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('score', models.FloatField(blank=True, null=True)),
                ('passed', models.BooleanField(blank=True, null=True)),
                ('genie_scenario_data', models.JSONField(default=dict)),
                ('is_genie_generated', models.BooleanField(default=False)),
                ('scenario', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='incident_runs', to='simulations.scenario')),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
        migrations.CreateModel(
            name='MissionParticipant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('lead_operator', 'Lead Operator'), ('support_operator', 'Support Operator'), ('observer', 'Observer'), ('supervisor', 'Supervisor')], max_length=20)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('last_seen', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_ready', models.BooleanField(default=False)),
                ('run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mission_participants', to='simulations.incidentrun')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mission_participations', to=settings.AUTH_USER_MODEL)),
            ],
            options={},
        ),
        migrations.CreateModel(
            name='IncidentEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('event_type', models.CharField(choices=[('action_submitted', 'Action Submitted'), ('phase_changed', 'Phase Changed'), ('escalation_triggered', 'Escalation Triggered'), ('hint_requested', 'Hint Requested'), ('intervention_applied', 'Intervention Applied'), ('participant_joined', 'Participant Joined'), ('participant_left', 'Participant Left'), ('timeout_occurred', 'Timeout Occurred'), ('genie_event', 'Genie Event'), ('system', 'System')], max_length=30)),
                ('payload', models.JSONField(default=dict)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='incident_events', to=settings.AUTH_USER_MODEL)),
                ('run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='simulations.incidentrun')),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
        migrations.CreateModel(
            name='ThreatNode',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('label', models.CharField(max_length=200)),
                ('severity', models.IntegerField(choices=[(1, 'Low'), (2, 'Medium'), (3, 'High'), (4, 'Critical'), (5, 'Catastrophic')])),
                ('trigger_condition', models.JSONField()),
                ('consequence_payload', models.JSONField()),
                ('phase', models.CharField(max_length=20)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='children', to='simulations.threatnode')),
                ('scenario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='threat_nodes', to='simulations.scenario')),
            ],
            options={},
        ),
        migrations.AddField(
            model_name='incidentrun',
            name='participants',
            field=models.ManyToManyField(related_name='incident_runs', through='simulations.MissionParticipant', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterUniqueTogether(
            name='missionparticipant',
            unique_together={('run', 'user')},
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX idx_incident_event_run_timestamp "
                "ON simulations_incidentevent(run_id, timestamp);"
            ),
            reverse_sql="DROP INDEX idx_incident_event_run_timestamp;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX idx_incident_event_type ON simulations_incidentevent(event_type);",
            reverse_sql="DROP INDEX idx_incident_event_type;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX idx_incident_run_status ON simulations_incidentrun(status);",
            reverse_sql="DROP INDEX idx_incident_run_status;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX idx_incident_run_phase ON simulations_incidentrun(phase);",
            reverse_sql="DROP INDEX idx_incident_run_phase;",
        ),
    ]

