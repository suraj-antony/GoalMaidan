from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('fixtures', '0004_matchevent_player_name_alter_matchevent_minute_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='matchevent',
            name='minute',
            field=models.IntegerField(blank=True, default=0, null=True),
        ),
    ]
