import math
import random

from asgiref.sync import sync_to_async
from django.core.cache import cache
from .player import Player

class Ball:
    def __init__(self, game_id, player1, player2):
        self.x = 50
        self.y = 50
        self.speed = 0.58
        self.game_id = game_id
        self.player1 = Player(player1.player_id, player1.game_id)
        self.player2 = Player(player2.player_id, player2.game_id)
        rand = random.choice([1,2])
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if rand == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)
        self.is_resetting = False

    async def reset(self, player_as_score):
        self.is_resetting = True
        self.x = 50
        self.y = 50
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if player_as_score == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)

        if player_as_score == 1:
            await self.player1.add_point()
        else:
            await self.player2.add_point()

        await self.save_to_cache()    
        return

    async def update_position(self):
        bound_wall = False
        bound_player = False
        self.x += self.vx
        self.y += self.vy
        bound_wall = await self.check_boundaries()
        bound_player = await self.check_boundaries_player()
        return bound_wall, bound_player

    async def check_boundaries(self):
        if self.y <= 1 or self.y >= 99:
            self.vy = -self.vy
            return True
        if self.x <= 1 or self.x >= 99:
            player_as_score = 1 if self.x >= 99 else 2
            await self.reset(player_as_score)
        return False

    async def check_boundaries_player(self):
        players = await Player.get_players_of_game(self.game_id)
        if self.x <= 3 and players[0].y <= self.y <= players[0].y + 16 or \
                self.x >= 97 and players[1].y <= self.y <= players[1].y + 16:
            if self.x <= 3 and players[0].y <= self.y <= players[0].y + 16:
                colission_point = (self.y + 1) - (players[0].y + 8)
            if self.x >= 95 and players[1].y <= self.y <= players[1].y + 16:
                colission_point = (self.y + 1) - (players[1].y + 8)
            normalized_point = colission_point / 8
            max_bounce_angle = math.pi / 4
            bounce_angle = normalized_point * max_bounce_angle
            
            self.vx = -self.vx
            self.vy = self.speed * math.sin(bounce_angle)
            if abs(normalized_point) > 0.9:
                self.vy *= 0.5
            return True
        return False

    @sync_to_async
    def save_to_cache(self):
        cache.set(f'ball_{self.game_id}_state', {
            'x': self.x,
            'y': self.y,
            'vx': self.vx,
            'vy': self.vy,
            'is_resetting': self.is_resetting
        }, timeout=60*30)

    @classmethod
    @sync_to_async
    def load_from_cache(cls, game_id):
        data = cache.get(f'ball_{game_id}_state')
        if data:
            return data
        return None
