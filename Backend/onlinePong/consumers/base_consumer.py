import json
import aioredis

from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async
from django.core.cache import cache, caches

class BaseGameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.player_id = self.scope['url_route']['kwargs']['current_player_id']
        self.game_group_name = f'game_{self.game_id}'

        if not await self.initialize_game():
            await self.close()
            return

        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()

    async def initialize_game(self):
        self.game = await self.get_game_from_cache(self.game_id)
        if not self.game:
            return False

        self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(f"game_update:{self.game_id}")
        return True

    @staticmethod
    async def get_game_from_cache(game_id):
        return await sync_to_async(cache.get)(f'game_{game_id}')

    async def set_game_to_cache(self, game_id, game_data):
        await sync_to_async(cache.set)(f'game_{game_id}', game_data, timeout=60 * 30)

    async def remove_game_from_cache(self, game_id):
        await sync_to_async(cache.delete)(f'game_{game_id}')

    async def publish_to_redis(self, message):
        await self.redis.publish(f"game_update:{self.game_id}", json.dumps(message))
