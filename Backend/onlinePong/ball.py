import math
import random
from django.core.cache import cache

class Ball:
    def __init__(self, game_id):
        self.x = 0
        self.y = 0
        self.vx = 0
        self.vy = 0
        self.speed = 0.20
        self.game_id = game_id
        self.reset()

    def reset(self):
        self.x = 50
        self.y = 50
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        self.vx = self.speed * math.cos(angle)
        self.vy = self.speed * math.sin(angle)

    def update_position(self):
        self.x += self.vx
        self.y += self.vy
        self.check_boundaries()

    def check_boundaries(self):
        if self.y <= 0 or self.y >= 100:
            self.vy = -self.vy
        if self.x <= 0 or self.x >= 100:
            self.reset()

    def save_to_cache(self):
        cache.set(f'ball_{self.game_id}_state', {'x': self.x, 'y': self.y, 'vx': self.vx, 'vy': self.vy}, timeout=None)

    @staticmethod
    def load_from_cache(game_id):
        data = cache.get(f'ball_{game_id}_state')
        if data:
            return data
        return None