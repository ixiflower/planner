# Generated manually for ChatMessage save functionality
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tickets', '0048_structureboard'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmessage',
            name='is_saved',
            field=models.BooleanField(default=False, help_text='Whether this message is saved by the sender'),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='saved_by',
            field=models.ManyToManyField(blank=True, help_text='Users who saved this message', related_name='saved_messages', to=settings.AUTH_USER_MODEL),
        ),
    ]