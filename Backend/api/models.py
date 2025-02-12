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


import uuid
from django.db import models
from django.core.exceptions import ValidationError

class Tournament(models.Model):
    code = models.CharField(max_length=10, unique=True, editable=False, default=None)
    players = models.ManyToManyField('MyUser', blank=True, related_name='tournaments')
    started = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = str(uuid.uuid4())[:8]  # Generate a short unique code
        super().save(*args, **kwargs)

    def add_player(self, user):
        # """Adds a player to the tournament if there's space."""
        if self.players.count() >= 4:
            raise ValidationError("Tournament is full.")
        self.players.add(user)
        self.check_start()

    def check_start(self):
        # """Starts the tournament if 4 players have joined."""
        if self.players.count() == 4:
            self.started = True
            self.save()

    def __str__(self):
        return f"Tournament {self.code} - Players: {self.players.count()}/4 - Started: {self.started}"
