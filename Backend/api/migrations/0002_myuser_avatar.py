# Generated by Django 4.2.16 on 2024-10-07 22:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='myuser',
            name='avatar',
            field=models.ImageField(default='avatars/default.png', upload_to='avatars/'),
        ),
    ]
