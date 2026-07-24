from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('awards', '0004_matchaward_created_at_matchaward_player_name_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournamentaward',
            name='player_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='tournamentaward',
            name='team_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AlterField(
            model_name='tournamentaward',
            name='player',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                to='teams.player',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='tournamentaward',
            unique_together={('tournament', 'award_type')},
        ),
    ]
