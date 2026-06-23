from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0025_alter_v2rayconfig_options_telegram'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegram',
            name='send_log',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='telegram',
            name='send_report',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='telegram',
            name='send_tasks',
            field=models.BooleanField(default=False),
        ),
    ]

