import math
import random
import time
from asgiref.sync import sync_to_async
from django.core.cache import cache
from .player import Player

class Ball:
    def __init__(self, game_id):
        self.x = 50
        self.y = 50
        self.speed = 0.5
        self.old_speed = self.speed
        self.game_id = game_id
        rand = random.choice([1,2])
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        direction = -1 if rand == 1 else 1
        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)
        self.is_resetting = False
        self.as_reset = False
        self.vector_as_change = False
        self.last_bound_player = None
        self.last_bound_wall = None

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
        self.vector_as_change = True
        if player_as_score == 1:
            await game.p1.add_point()
        else:
            await game.p2.add_point()

        await game.save_to_cache()    
        return

    async def update_position(self, game):
        self.as_reset = False
        next_x = self.x + self.vx
        next_y = self.y + self.vy
        await self.check_boundaries(next_x, next_y, game)
        await self.check_boundaries_player(next_x, next_y, game)
        if not self.as_reset:
            self.y = next_y
            self.x = next_x
        if game.bound_wall or game.bound_player:
            await self.save_to_cache()
            return True
        return False

    async def check_boundaries(self, next_x, next_y, game):
        if next_y < 1 or next_y > 99:
            self.last_bound_wall = time.time()
            self.vy = -self.vy
            self.vector_as_change = True
            game.bound_wall = True
            if next_y < 1:
                next_y = 1
            else:
                next_y = 99
        elif next_x < 1 or next_x > 99:
            player_as_score = 1 if next_x > 99 else 2
            await self.reset(player_as_score, game)
            self.as_reset = True

    async def check_boundaries_player(self, next_x, next_y, game):
        await game.update_players()
        colission_point = 0
        now = time.time()
        if self.last_bound_player and now - self.last_bound_player < 0.01:
            self.speed = self.old_speed
            return
        if next_x < 3 and game.p1.y < next_y + 0.5 < game.p1.y + 17 or \
                next_x > 97 and game.p2.y < next_y - 0.5 < game.p2.y + 17:
            self.last_bound_player = time.time()
            game.bound_player = True
            if self.speed < 1:
                self.old_speed = self.speed
                self.speed += 0.1
            if next_x < 3 and game.p1.y < next_y < game.p1.y + 17:
                colission_point = (next_y + 1) - (game.p1.y + 8)
            elif next_x > 97 and game.p2.y < next_y < game.p2.y + 17:
                colission_point = (next_y + 1) - (game.p2.y + 8)
            normalized_point = colission_point / 8
            max_bounce_angle = math.pi / 4
            bounce_angle = normalized_point * max_bounce_angle
            
            self.vx = -math.copysign(1, self.vx) * self.speed * math.cos(bounce_angle)
            self.vy = self.speed * math.sin(bounce_angle)
            if abs(normalized_point) > 0.9:
                self.vy *= 0.5

            if next_x < 3:
                next_x = 3
            else:
                next_x = 97
            self.vector_as_change = True
            

    def check_time_collision(self):
        if not self.last_bound_player or not self.last_bound_wall:
            return
        print(self.last_bound_wall - self.last_bound_player)
        # if 0 < self.last_bound_wall - self.last_bound_player < :

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
