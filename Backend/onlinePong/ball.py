import math
import random
from django.core.cache import cache
from .player import Player

class Ball:
    def __init__(self, game_id, player1, player2):
        self.x = 50
        self.y = 50
        self.speed = 0.50
        self.game_id = game_id
        self.player1 = Player(player1['session_id'], player1['game_id'])
        self.player2 = Player(player2['session_id'], player2['game_id'])
        rand = random.choice([1,2])
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if rand == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)

    async def reset(self, player_as_score):
        self.x = 50
        self.y = 50
        print('b:3')
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        print('b:4')
        direction = -1 if player_as_score == 1 else 1
        print('b:5')
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)

        if player_as_score == 1:
            print('b:6.1')
            print('p1:', self.player1)
            await self.player1.add_point()
        else:
            print('b:6.1')

            await self.player2.add_point()

    async def update_position(self):
        self.x += self.vx
        self.y += self.vy
        await self.check_boundaries()
        await self.check_boundaries_player()

    async def check_boundaries(self):
        if self.y <= 1 or self.y >= 99:
            self.vy = -self.vy
        if self.x <= 1 or self.x >= 99:
            print('b:1')
            player_as_score = 1 if self.x >= 99 else 2
            print('b:2')
            await self.reset(player_as_score)

    async def check_boundaries_player(self):
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
