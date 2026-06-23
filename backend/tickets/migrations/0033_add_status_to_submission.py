# Generated migration for adding status field to Submission model

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0032_telegram_google_sheets_auto_sync_enabled_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='submission',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('declined', 'Declined'),
                ],
                default='pending',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='submission',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]