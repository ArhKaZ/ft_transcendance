# Generated by Django 4.2.16 on 2025-02-26 13:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_tournament_left'),
    ]

    operations = [
        migrations.AddField(
            model_name='myuser',
            name='looses',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='myuser',
            name='wins',
            field=models.IntegerField(default=0),
        ),
    ]
