# Generated migration for send_task_notifications field
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0030_telegram_dollar_price_cmd_telegram_gold_price_cmd'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegram',
            name='send_task_notifications',
            field=models.BooleanField(default=True, help_text='Send notifications when tasks are assigned'),
        ),
    ]