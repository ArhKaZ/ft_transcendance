import asyncio

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
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.game_group_name = f'game_{self.game_id}'
        self.game = await self.get_game_from_cache(self.game_id)

        if not self.game:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )

        await self.accept()


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)

        if text_data_json['action'] == 'ready':
            await self.set_player_ready(self.session_id)
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_message',
                    'event': 'game_message',
                    'message': f'{self.session_id} is ready'
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

    @database_sync_to_async
    def set_player_ready(self, session_id):
        cache = caches['default']
        cache_key = f'game_{self.game_id}'

        with cache.lock(f'{cache_key}_lock'):
            game = cache.get(cache_key)

            if not game:
                return

            if game['player1'] == session_id:
                game['player1_ready'] = True
            elif game['player2'] == session_id:
                game['player2_ready'] = True

            cache.set(cache_key, game, timeout=60*30)
            player = Player(session_id, self.game_id)
            player.save_to_cache()

    async def check_both_ready(self):
        cache = caches['default']
        cache_key = f'game_{self.game_id}'

        with cache.lock(f'{cache_key}_lock'):
            game = await self.get_game_from_cache(self.game_id)
            if game.get('player1_ready') and game.get('player2_ready'):
                game['status'] = 'IN_PROGRESS'
                cache.set(f'game_{self.game_id}', game, timeout=60*30)
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'game_message',
                        'message': 'game_start'
                    }
                )
                self.send_ball_task = asyncio.create_task(self.send_ball_position())

    async def send_ball_position(self):
        while True:
            ball_state = Ball.load_from_cache(self.game_id)
            if not ball_state:
                ball = Ball(self.game_id)
            else:
                ball = Ball(self.game_id)
                ball.x = ball_state['x']
                ball.y = ball_state['y']
                ball.vx = ball_state['vx']
                ball.vy = ball_state['vy']

            ball.update_position()

            ball.save_to_cache()

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
            await asyncio.sleep(0.02)
            game = await self.get_game_from_cache(self.game_id)
            if game['status'] == 'FINISH':
                break

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
        player_state = Player.load_from_cache(data['session_id'], self.game_id)
        if player_state:
            player = Player(data['session_id'], self.game_id)
            player.y = player_state['y']
        else:
            player = Player(data['session_id'], self.game_id)

        player.move(data['direction'])
        player.save_to_cache()

        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'player_move',
                'event': 'player_move',
                'y': player.y,
                'session_id': data['session_id']
            }
        )

    async def player_move(self, event):
        type = event['type']
        y = event['y']
        session_id = event['session_id']
        await self.send(text_data=json.dumps({
            'y': y,
            'type': type,
            'session_id': session_id
        }))


    async def update_score(self, player):
        game = await self.get_game_from_cache(self.game_id)
        score = game['score']
        if player == 1:
            score[0] += 1
        else:
            score[1] += 1

        if score[0] == 11 or score[1] == 11:
            winner = 'P1' if score[0] == 11 else 'P2'
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_finish',
                    'event': 'game_finished',
                    'message': f'{winner} as win'
                }
            )
            game['status'] = 'FINISH'
        else:
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'score_update',
                    'event': 'score_update',
                    'score': score
                }
            )
        game.save_to_cache()

    async def game_finish(self, event):
        type = event['type']
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': type,
            'message': message
        }))

    async def score_update(self, event):
        type = event['type']
        score = event['score']
        await self.send(text_data=json.dumps({
            'type': type,
            'score': score
        }))
