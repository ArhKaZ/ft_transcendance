# Generated by Django 4.2.16 on 2024-12-30 21:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_matchhistory'),
    ]

    operations = [
        migrations.AddField(
            model_name='myuser',
            name='ligue_points',
            field=models.IntegerField(default=500),
        ),
    ]