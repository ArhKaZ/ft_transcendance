from django.db import models
from django.contrib.auth.models import AbstractUser
import binascii
import os
from django.utils import timezone


class MyUser(AbstractUser):
    description = models.TextField(blank=True)
    pseudo = models.CharField(max_length=100, unique=True)
    avatar = models.ImageField(upload_to='avatars/', default='avatars/default.png')
    ligue_points = models.IntegerField(default=500)
    wins = models.IntegerField(default=0)
    looses = models.IntegerField(default=0)
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
    finalist = models.ManyToManyField('MyUser', blank=True, related_name='finalist')
    winner = models.ManyToManyField('MyUser', blank=True, related_name='winner')
    left = models.ManyToManyField('MyUser', blank=True, related_name='left')
    started = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    all_matches = models.ManyToManyField('TournamentMatch', blank=True, related_name='tournament_matches')

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
    
    def add_finalist(self, user):
        # """Adds a player to the tournament if there's space."""
        if self.finalist.count() >= 2:
            raise ValidationError("Final is full.")
        self.finalist.add(user)

    def add_left(self, user):
        # """Adds a player to the tournament if there's space."""
        if self.left.count() >= 4:
            raise ValidationError("Everyone already left.")
        self.left.add(user)

    def add_winner(self, user):
        # """Adds a player to the tournament if there's space."""
        if self.winner.count() >= 1:
            raise ValidationError("Already have a winner.")
        self.winner.add(user)

    def check_start(self):
        # """Starts the tournament if 4 players have joined."""
        if self.players.count() == 4:
            self.started = True
            self.create_matchs()
            self.save()

    def create_matchs(self):
        players = list(self.players.all())
        if len(players) != 4:
            raise ValidationError("Tournament need 4 players")
        
        match1 = TournamentMatch.objects.create(
            tournament=self, player1=players[0], player2=players[1]
        )

        match2 = TournamentMatch.objects.create(
            tournament=self, player1=players[2], player2=players[3]
        )
        self.all_matches.add(match1, match2)

    def create_final(self, winner1, winner2):
        final = TournamentMatch.objects.create(
            tournament=self, player1=winner1, player2=winner2, is_final=True
        )
        self.all_matches.add(final)
        self.save()

    def all_matches_finished(self):
        regular_matches = self.all_matches.filter(is_final=False)

        all_finished = True

        for match in regular_matches:
            if match.winner is None:
                all_finished = False
                break
        
        return all_finished

    def __str__(self):
        return f"Tournament {self.code} - Players: {self.players.count()}/4 - Started: {self.started}"

class TournamentMatch(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    player1 = models.ForeignKey('MyUser', on_delete=models.CASCADE, related_name='match_player1')
    player2 = models.ForeignKey('MyUser', on_delete=models.CASCADE, related_name='match_player2')
    score = models.CharField(max_length=10, blank=True, null=True)
    winner = models.ForeignKey('MyUser', on_delete=models.SET_NULL, blank=True, null=True, related_name='match_winner')
    is_final = models.BooleanField(default=False)

    def set_winner(self, winner, score):
        if winner not in [self.player1, self.player2]:
            raise ValidationError("Winner must be in the match")

        self.winner = winner
        self.score = score
        self.save()

    def __str__(self):
        return f"Match {self.tournament.code} - {self.player1} vs {self.player2} - Winner: {self.winner}"

class RefreshToken(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    created = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = binascii.hexlify(os.urandom(32)).decode()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=15)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at

class AccessToken(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    created = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    refresh_token = models.ForeignKey(RefreshToken, on_delete=models.CASCADE)
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = binascii.hexlify(os.urandom(32)).decode()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=5)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at