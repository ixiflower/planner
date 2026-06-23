# Generated manually
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0041_chatmessage_image_alter_chatmessage_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='report_images/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='tickets.report')),
            ],
            options={
                'verbose_name': 'Report Image',
                'verbose_name_plural': 'Report Images',
                'ordering': ['uploaded_at'],
            },
        ),
    ]
