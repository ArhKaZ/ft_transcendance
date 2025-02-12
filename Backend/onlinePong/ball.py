import math
import random

from asgiref.sync import sync_to_async
from django.core.cache import cache
from .player import Player

class Ball:
    def __init__(self, game_id):
        self.x = 50
        self.y = 50
        self.speed = 0.40
        self.game_id = game_id
        rand = random.choice([1,2])
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if rand == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)
        self.is_resetting = False

    def __repr__(self):
        return f"Ball(x:{self.x}, y:{self.y})"

    async def reset(self, player_as_score, game):
        self.is_resetting = True
        self.x = 50
        self.y = 50
        self.speed = 0.4
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if player_as_score == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)

        if player_as_score == 1:
            await game.p1.add_point()
        else:
            await game.p2.add_point()

        await self.save_to_cache()    
        return

    async def update_position(self, game):
        await self.check_boundaries(game)
        await self.check_boundaries_player(game)

    async def check_boundaries(self, game):
        nextY = self.y + self.vy
        nextX = self.x + self.vx
        if nextY <= 1 or nextY >= 99:
            self.vy = -self.vy
            game.bound_wall = True
            if nextY <= 1:
                self.y = 1
            elif nextY <= 99:
                self.y = 99
        elif nextX <= 1 or nextX >= 99:
            player_as_score = 1 if nextX >= 99 else 2
            await self.reset(player_as_score, game)
        else:
            self.y = nextY

    async def check_boundaries_player(self, game):
        await game.update_players()
        nextY = self.y + self.vy
        nextX = self.x + self.vx
        if nextX <= 3 and game.p1.y <= nextY <= game.p1.y + 16 or \
                nextX >= 97 and game.p2.y <= nextY <= game.p2.y + 16:
            game.bound_player = True
            if nextX <= 3 and game.p1.y <= nextY <= game.p1.y + 16:
                colission_point = (self.y + 1) - (game.p1.y + 8)
            elif nextX >= 97 and game.p2.y <= nextY <= game.p2.y + 16:
                colission_point = (self.y + 1) - (game.p2.y + 8)
            normalized_point = colission_point / 8
            max_bounce_angle = math.pi / 4
            bounce_angle = normalized_point * max_bounce_angle
            
            direction = -math.copysign(1, self.vx)

            self.vx = direction * self.speed * math.cos(bounce_angle)
            self.vy = self.speed * math.sin(bounce_angle)
            if abs(normalized_point) > 0.9:
                self.vy *= 0.5
            if direction == 1:
                self.x = 3
            elif direction == -1:
                self.x = 97
            if self.speed < 0.80:
                self.speed += 0.04
        else:
            self.x = nextX
            

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
    
    async def update_ball(self):
        key = f'ball_{self.game_id}_state'
        newBall = await sync_to_async(cache.get)(key)
        if newBall:
            self.x = newBall['x']
            self.y = newBall['y']
            self.vx = newBall['vx']
            self.vy = newBall['vy']
            self.is_resetting = newBall['is_resetting']

    
    def sleep_base_ball_pos(self):
        if self.x >= 30 and self.x <= 60:
            print(f'condition: {self.x}')
            return 0.033
        else:
            return 0.02