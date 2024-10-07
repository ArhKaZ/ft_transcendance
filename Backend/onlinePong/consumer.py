import asyncio
import aioredis

from asyncio import create_task

from asgiref.sync import sync_to_async
from django.conf import settings
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from .ball import Ball
from .player import Player
import json

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ball = None
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.player_id = self.scope['url_route']['kwargs']['current_player_id']
        self.game_group_name = f'game_{self.game_id}'
        self.game = await self.get_game_from_cache(self.game_id)

        if not self.game:
            await self.close()
            return
        self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(f"game_update:{self.game_id}")

        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )

        await self.accept()
        self.listen_task = asyncio.create_task(self._redis_listener())


    async def disconnect(self, close_code):
        if hasattr(self, 'listen_task'):
            self.listen_task.cancel()
        if hasattr(self, 'pubsub'):
            await self.pubsub.unsubscribe(f"game_update:{self.game_id}")
        if hasattr(self, 'redis'):
            await self.redis.close()
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        if text_data_json['action'] == 'ready':
            await self.async_set_player_ready(self.player_id)
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_message',
                    'event': 'game_message',
                    'message': f'{self.player_id} is ready'
                }
            )
            await self.check_both_ready()

        elif text_data_json['action'] == 'move':
           await self.move_player(text_data_json)


    async def game_message(self, event):
        message = event['message']

        await self.send(text_data=json.dumps({
            'message': message
        }))

    @database_sync_to_async
    def get_game_from_cache(self, game_id):
        return cache.get(f'game_{game_id}')

    async def async_set_player_ready(self, player_id):
        player = await self.set_player_ready(player_id)
        if player:
            await player.save_to_cache()

    @database_sync_to_async
    def set_player_ready(self, player_id):
        cache = caches['default']
        cache_key = f'game_{self.game_id}'
        with cache.lock(f'{cache_key}_lock'):
            game = cache.get(cache_key)
            if not game:
                return
            if game['player1'] == player_id:
                game['player1_ready'] = True
            elif game['player2'] == player_id:
                game['player2_ready'] = True
            cache.set(cache_key, game, timeout=60*30)
            player = Player(player_id, self.game_id)
            return player

    async def check_both_ready(self):
        cache_key = f'game_{self.game_id}'

        async with asyncio.Lock():
            game = await self.get_game_from_cache(self.game_id)
            if game.get('player1_ready') and game.get('player2_ready'):
                game['status'] = 'IN_PROGRESS'
                await self.set_game_to_cache(self.game_id, game)
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'game_message',
                        'message': 'game_start'
                    }
                )
                self.send_ball_task = asyncio.create_task(self.send_ball_position())


    async def set_game_to_cache(self, game_id, game_data):
        cache = caches['default']
        await sync_to_async(cache.set)(f'game_{game_id}', game_data, timeout=60*30)

    async def send_ball_position(self):
        while True:
            try:
                ball_state = await Ball.load_from_cache(self.game_id)
                players = await Player.get_players_of_game(self.game_id)
                if not ball_state:
                    ball = Ball(self.game_id, players[0], players[1])
                else:
                    ball = Ball(self.game_id, players[0], players[1])
                    ball.x = ball_state['x']
                    ball.y = ball_state['y']
                    ball.vx = ball_state['vx']
                    ball.vy = ball_state['vy']

                await ball.update_position()
                await ball.save_to_cache()

                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'ball_position',
                        'event': 'ball_position',
                        'x': ball.x,
                        'y': ball.y,
                        'message': 'ball_position_send'
                    }
                )
            except Exception as e:
                print(f'Error in send_ball_position: {e}')
            finally:
                await asyncio.sleep(0.02)


    async def ball_position(self, event):
        type = event['type']
        x = event['x']
        y = event['y']
        await self.send(text_data=json.dumps({
            'x': x,
            'y': y,
            'type': type
        }))

    async def move_player(self, data):
        player_state = await Player.load_from_cache(data['player_id'], self.game_id)
        if player_state:
            player = Player(data['player_id'], self.game_id)
            player.y = player_state['y']
            player.score = player_state['score']
        else:
            player = Player(data['player_id'], self.game_id)

        player.move(data['direction'])
        await player.save_to_cache()

        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'player_move',
                'event': 'player_move',
                'y': player.y,
                'player_id': player.player_id
            }
        )

    async def player_move(self, event):
        type = event['type']
        y = event['y']
        player_id = event['player_id']
        await self.send(text_data=json.dumps({
            'y': y,
            'type': type,
            'player_id': player_id
        }))

    async def score_update(self, event):
        type = event['type']
        scores = event['scores']
        await self.send(text_data=json.dumps({
            'type': type,
            'score': scores
        }))

    async def _redis_listener(self):
        try:
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    print(message['data'])
                    if message['data'] == b"score_updated":
                        players = await Player.get_players_of_game(self.game_id)
                        print(players[0].score, players[1].score)
                        scores = [players[0].score, players[1].score]
                        await self.send_score_update(scores)
                    elif message['data'].startswith(b"game_finish_"):
                        winning_session = message['data'].decode().split('_')[-1]
                        self.send_ball_task.cancel()
                        await self.send_game_finish(winning_session)
        except asyncio.CancelledError:
            pass

    async def send_score_update(self, scores):
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'score_update',
                'scores': scores
            }
        )

    async def send_game_finish(self, winning_session):
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'game_finish',
                'winning_session': winning_session
            }
        )

    async def game_finish(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_finish',
            'winning_session': event['winning_session']
        }))