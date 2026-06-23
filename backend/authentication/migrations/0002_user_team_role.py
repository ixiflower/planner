from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='team_role',
            field=models.CharField(choices=[('Leader', 'Leader'), ('Mod', 'Mod'), ('Member', 'Member')], default='Member', max_length=16),
        ),
    ]