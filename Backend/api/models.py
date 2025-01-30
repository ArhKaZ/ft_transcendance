from django.db import models
from django.contrib.auth.models import AbstractUser


class MyUser(AbstractUser):
    description = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', default='avatars/default.png')
    ligue_points = models.IntegerField(default=500)
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
    friends = models.ManyToManyField(
        'self',
        symmetrical=True,
        blank=True,
        related_name='friend_set',
        verbose_name='friends',
        help_text='The users that this user is friends with.',
    )
    pending_friends = models.ManyToManyField(
        'self',
		symmetrical=False,
		blank=True,
		related_name='pending_friend_set',
		verbose_name='pending friends',
		help_text='The users that have sent a friend request to this user.',
	)
    
class MatchHistory(models.Model):
    user = models.ForeignKey('MyUser', on_delete=models.CASCADE, related_name="matches")
    opponent_name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, default=None)
    date = models.DateField(auto_now_add=True)  # Corrigé auto_now_ad -> auto_now_add
    won = models.BooleanField()

    class Meta:
        ordering = ['-date']  # Pour avoir les matchs les plus récents en premier

    def __str__(self):
        return f"{self.user.username} vs {self.opponent_name} - Date {self.date} - Win: {self.won}"

class Tournament(models.Model):
    running = models.BooleanField()
    participants = models.ManyToManyField(
        'MyUser',
        related_name='tournaments',
        blank=True,
        help_text='Users participating in the tournament (maximum 10)',
    )

    def clean(self):
        from django.core.exceptions import ValidationError
        # Check if the number of participants exceeds 10
        if self.participants.count() > 10:
            raise ValidationError('A tournament cannot have more than 10 participants.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Tournament {self.id} - {'Running' if self.running else 'Not running'}"
