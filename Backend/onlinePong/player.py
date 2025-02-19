import aioredis
from asgiref.sync import sync_to_async

from django.core.cache import cache
from django.template.context_processors import static

from backend import settings


class Player:
    def __init__(self, player_info, game_id, ready = False):
        self.y = 42.5
        self.nb = 0
        self.speed = 0.7
        self.score = 0
        self.game_id = game_id
        self.id = player_info['id']
        self.username = player_info['username']
        self.avatar = player_info['avatar']
        self.ready = ready

    def __repr__(self):
        return f"Player(id={self.player_id}, nb={self.nb}, y={self.y}, score={self.score})"

    def set_y(self, y):
        self.y = y

    def move(self, direction):
        if self.y > 1.5 :
            if direction == 'up':
                self.y -= self.speed
        if self.y + 15 < 98.5:
            if direction == 'down':
                self.y += self.speed

    async def save_to_cache(self):
        cache_key = f'player_{self.id}_{self.game_id}'
        await sync_to_async(cache.set)(cache_key, {
            'y': self.y,
            'player_id': self.id,
            'game_id': self.game_id,
            'score': self.score,
            'ready': self.ready
        })

    @staticmethod
    async def load_from_cache(player_id, game_id):
        cache_key = f'player_{player_id}_{game_id}'
        data = await sync_to_async(cache.get)(cache_key)
        return data if data else None

    async def add_point(self):
        try:
            self.score += 1
            await self.save_to_cache()

            redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
            await redis.publish(f"game_update:{self.game_id}", f"score_updated_{self.id}")
            if self.score >= 5:
                await redis.publish(f"game_update:{self.game_id}", f"game_finish_{self.id}")
            await redis.close()
        except aioredis.RedisError as e:
            print(f"Redis Error in add_point: {e}")
        except Exception as e:
            print(f"Exception in add_point: {e}")

    async def delete_from_cache(self):
        cache_key = f'player_{self.id}_{self.game_id}'
        await sync_to_async(cache.delete)(cache_key)

    async def update_player(self):
        player_cache = await self.load_from_cache(self.id, self.game_id)
        if player_cache:
            self.ready = player_cache['ready']
            self.score = player_cache['score']
            self.y = player_cache['y']
            return 0
        else:
            return -1