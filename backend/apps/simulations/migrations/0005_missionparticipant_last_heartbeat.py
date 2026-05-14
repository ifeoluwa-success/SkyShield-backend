from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('simulations', '0004_alter_coursecertificate_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='missionparticipant',
            name='last_heartbeat',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
