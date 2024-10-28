from channels.db import database_sync_to_async
from django.core.cache import caches
from onlinePong.player import Player

import asyncio

class GameHandlers:
    def __init__(self, consumer):
        self.consumer = consumer

    async def handle_player_ready(self, data):
        await self.async_set_player_ready(self.consumer.player_id)
        message = {
            'type': 'player_ready',
            'player_id': self.consumer.player_id
        }
        await self.consumer.channel_layer.group_send(self.consumer.game_group_name, message)
        await self.consumer.publish_to_redis(message)
        await self.check_both_ready()

    async def check_both_ready(self):
        async with asyncio.Lock():
            game = await self.consumer.get_game_from_cache(self.consumer.game_id)
            if game.get('player1_ready') and game.get('player2_ready'):
                game['status'] = 'IN_PROGRESS'
                await self.consumer.set_game_to_cache(self.consumer.game_id, game)
                message = {
                    'type': 'game_message',
                    'message': 'game_start'
                }
                await self.consumer.channel_layer.group_send(self.consumer.game_group_name, message)
                await self.consumer.publish_to_redis(message)
                self.consumer.send_ball_task = asyncio.create_task(self.consumer.ball_handler.send_ball_position())

    @database_sync_to_async
    def async_set_player_ready(self, player_id):
        cache = caches['default']
        cache_key = f'game_{self.consumer.game_id}'
        with cache.lock(f'{cache_key}_lock'):
            game = cache.get(cache_key)
            if not game:
                return None
            if game['player1'] == player_id:
                game['player1_ready'] = True
            elif game['player2'] == player_id:
                game['player2_ready'] = True
            cache.set(cache_key, game, timeout=60 * 30)
            return Player(player_id, self.consumer.game_id)