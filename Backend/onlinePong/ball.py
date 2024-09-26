import math
import random
from django.core.cache import cache
from .player import Player

class Ball:
    def __init__(self, game_id, player1, player2):
        self.x = 0
        self.y = 0
        self.vx = 0
        self.vy = 0
        self.speed = 0.50
        self.game_id = game_id
        self.player1 = player1
        self.player2 = player2
        self.reset(random.choice([1,2]))

    def reset(self, player_as_score):
        self.x = 50
        self.y = 50
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if player_as_score == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)

        if player_as_score == 1:
            self.player1.add_point()
        else:
            self.player2.add_point()

    def update_position(self):
        self.x += self.vx
        self.y += self.vy
        self.check_boundaries()
        self.check_boundaries_player()

    def check_boundaries(self):
        if self.y <= 1 or self.y >= 99:
            self.vy = -self.vy
        if self.x <= 1 or self.x >= 99:
            player_as_score = 1 if self.x >= 99 else 2
            self.reset(player_as_score)

    def check_boundaries_player(self):
        players = Player.get_players_of_game(self.game_id)
        if self.x <= 4 and players[0]['y'] <= self.y <= players[0]['y'] + 15 or \
                self.x >= 96 and players[1]['y'] <= self.y <= players[1]['y'] + 15:
            self.vx = -self.vx

    def save_to_cache(self):
        cache.set(f'ball_{self.game_id}_state', {'x': self.x, 'y': self.y, 'vx': self.vx, 'vy': self.vy}, timeout=None)

    @staticmethod
    def load_from_cache(game_id):
        data = cache.get(f'ball_{game_id}_state')
        if data:
            return data
        return None
