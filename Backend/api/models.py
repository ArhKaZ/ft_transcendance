from django.db import models
from django.contrib.auth.models import AbstractUser


class MyUser(AbstractUser):
    description = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', default='avatars/default.png')

    # Add related_name to avoid clashes
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='myuser_set',
        related_query_name='myuser',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='myuser_set',
        related_query_name='myuser',
    )
    
class MatchHistory(models.Model):
    user = models.ForeignKey('MyUser', on_delete=models.CASCADE, related_name="matches")
    opponent_name = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)  # Corrigé auto_now_ad -> auto_now_add
    won = models.BooleanField()

    class Meta:
        ordering = ['-date']  # Pour avoir les matchs les plus récents en premier

    def __str__(self):
        return f"{self.user.username} vs {self.opponent_name} - Date {self.date} - Win: {self.won}"