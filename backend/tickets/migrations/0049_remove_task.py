from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0048_structureboard'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Task',
        ),
    ]
