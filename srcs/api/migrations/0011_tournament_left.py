# Generated by Django 4.2.16 on 2025-02-22 12:20

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_tournament_finalist_tournament_winner'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='left',
            field=models.ManyToManyField(blank=True, related_name='left', to=settings.AUTH_USER_MODEL),
        ),
    ]
