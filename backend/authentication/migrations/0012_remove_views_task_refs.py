from django.db import migrations


def noop_forward(apps, schema_editor):
    pass


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0011_user_can_see_work_hours'),
        ('tickets', '0049_remove_task'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
