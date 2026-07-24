from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0005_tournament_activated_at_tournament_completed_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='fixtures_generated',
            field=models.BooleanField(default=False),
        ),
    ]
