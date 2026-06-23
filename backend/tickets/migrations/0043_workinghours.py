# Generated migration for WorkingHours model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tickets', '0042_reportimage'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkingHours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('morning_check_in', models.DateTimeField(blank=True, null=True)),
                ('morning_check_out', models.DateTimeField(blank=True, null=True)),
                ('afternoon_check_in', models.DateTimeField(blank=True, null=True)),
                ('afternoon_check_out', models.DateTimeField(blank=True, null=True)),
                ('is_currently_working', models.BooleanField(default=False)),
                ('current_shift', models.CharField(blank=True, choices=[('morning', 'Morning'), ('afternoon', 'Afternoon')], max_length=10, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='working_hours', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Working Hours',
                'verbose_name_plural': 'Working Hours',
                'ordering': ['-date', '-created_at'],
                'unique_together': {('user', 'date')},
            },
        ),
    ]
