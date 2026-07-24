from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0003_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='player',
            name='dob',
            field=models.DateField(blank=True, null=True),
        ),
    ]
