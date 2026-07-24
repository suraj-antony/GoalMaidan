from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fixtures', '0005_alter_matchevent_minute'),
        ('teams', '0004_alter_player_dob'),
    ]

    operations = [
        migrations.AddField(
            model_name='fixture',
            name='penalty_score_a',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='fixture',
            name='penalty_score_b',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='fixture',
            name='winner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='won_fixtures',
                to='teams.team',
            ),
        ),
    ]
