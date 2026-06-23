from django.db import migrations


class Migration(migrations.Migration):
    """
    Create tables for AUTH_USER_MODEL
    """
    initial = True

    dependencies = [
        ('auth', '__first__'),
    ]

    operations = []
