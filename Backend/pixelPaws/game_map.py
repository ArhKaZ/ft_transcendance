from asgiref.sync import sync_to_async
from django.core.cache import cache

class GameMap:
    def __init__(self, game_id):
        self.x = 25
        self.y = 50
        self.height = 34
        self.width = 45
        self.ground_y = self.y + 0.3
        self.ground_x = self.x
        self.ground_x_end = self.ground_x + (self.width - 0.1)
        self.back_src = 'city.png'
        self.stage_src = 'stage.png'
        self.game_id = game_id
        self.save_to_cache()

    async def save_to_cache(self):
        cache_key = f'pp_map_{self.game_id}'
        await sync_to_async(cache.set)(cache_key, {
            'x': self.x,
            'y': self.y,
            'height': self.height,
            'width': self.width,
            'ground_y': self.ground_y,
            'ground_x': self.ground_x,
            'ground_x_end': self.ground_x_end,
            'back_src': self.back_src,
            'stage_src': self.stage_src,
        })