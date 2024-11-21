# Generated by Django 4.2.16 on 2024-11-21 11:21

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_matchhistory'),
    ]

    operations = [
        migrations.AddField(
            model_name='myuser',
            name='friends',
            field=models.ManyToManyField(blank=True, related_name='friends_with', to=settings.AUTH_USER_MODEL, verbose_name='Friends'),
        ),
    ]
