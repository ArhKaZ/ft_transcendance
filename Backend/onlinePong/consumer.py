import asyncio
import json
import aioredis

from asgiref.sync import sync_to_async
from django.conf import settings
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from .ball import Ball
from .player import Player


class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args,  **kwargs):
        super().__init__(*args, **kwargs)
        self.listen_task = None
        self.countdown_task = None
        self._countdown_done = asyncio.Event()
        self.send_ball_task = None

    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.player_id = self.scope['url_route']['kwargs']['current_player_id']
        self.game_group_name = f'game_{self.game_id}'
        self.game_is_finished = False
        if not await self.initialize_game():
            await self.close()
            return

        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()

        self.listen_task = asyncio.create_task(self._redis_listener())
        await self.notify_player_connected()

    async def initialize_game(self):
        self.game = await self.get_game_from_cache(self.game_id)
        if not self.game:
            return False

        self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(f"game_update:{self.game_id}")
        return True

    async def notify_player_connected(self):
        player_name = self.game['player1_name'] if self.game['player1'] == self.player_id else self.game['player2_name']
        player_avatar = self.game['player1_avatar'] if self.game['player1'] == self.player_id else self.game['player2_avatar']
        message = {
            'type': 'player_connected',
            'player_id': self.player_id,
            'player_name': player_name,
            'player_avatar': player_avatar,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def disconnect(self, close_code):
        print(f"Disconnect player {self.player_id} from game {self.game_id}")
        await self.notify_game_cancel(self.player_id)
        await self.handle_disconnect()
        await self.cleanup()

    async def cleanup(self):
        if hasattr(self, 'listen_task'):
            self.listen_task.cancel()
        if hasattr(self, 'pubsub'):
            await self.pubsub.unsubscribe(f"game_update:{self.game_id}")
        if hasattr(self, 'redis'):
            await self.redis.close()
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def handle_disconnect(self):
        print(f"Handling disconnect from player {self.player_id} from game {self.game_id}")
        game = await self.get_game_from_cache(self.game_id)
        cache_key = f'game_update_{self.game_id}'

        with cache.lock(cache_key):
            if game['player1'] == self.player_id:
                if game['player2'] and game['player2_name']:
                    game['player1_name'] = game['player2_name']
                    game['player1'] = game['player2']
                    game['player1_ready'] = game['player2_ready']
                    game['player2'] = None
                    game['player2_name'] = None
                    game['player2_ready'] = False
                else:
                    await self.remove_game_from_cache(self.game_id)
                    print(f"Game {self.game_id} removed from cache")
                    return
            elif game['player2'] == self.player_id:
                game['player2'] = None
                game['player2_name'] = None
                game['player2_ready'] = False
            # elif game['player2'] is None and game['player1'] == self.player_id:
            #     await self.remove_game_from_cache(self.game_id)
            #     print(f"Game {self.game_id} removed from cache")
            #     return

            game['status'] = 'WAITING'
            await self.set_game_to_cache(self.game_id, game)

        print(f"Update game state: {game}")
        await self.send_players_info(game)


    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data['action']

        actions = {
            'ready': self.handle_player_ready,
            'move': self.move_player
        }

        handler = actions.get(action)
        if handler:
            await handler(data)

    async def handle_player_ready(self, data):
        await self.async_set_player_ready(self.player_id)
        message = {
            'type': 'player_ready',
            'player_id': self.player_id
        }
        await self.channel_layer.group_send(self.game_group_name, message)
        await self.check_both_ready()

    async def check_both_ready(self):
        async with asyncio.Lock():
            game = await self.get_game_from_cache(self.game_id)
            if game.get('player1_ready') and game.get('player2_ready'):
                game['status'] = 'IN_PROGRESS'
                await self.set_game_to_cache(self.game_id, game)
                await self.broadcast_game_start(game)
                if not self.countdown_task:
                    self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
                asyncio.create_task(self.launch_game_after_countdown())

    async def launch_game_after_countdown(self):
        await self._countdown_done.wait()
        if not self.send_ball_task:
            self.send_ball_task = asyncio.create_task(self.send_ball_position())

    async def run_countdown_sequence(self):
        for count in range(3, -1, -1):
            print('je passe ici')
            await self.notify_countdown(count)
            if count > 0:
                await asyncio.sleep(1)
            elif count == 0:
                await asyncio.sleep(2)
        self._countdown_done.set()

    async def send_ball_position(self):
        while True:
            try:
                ball = await self.get_or_create_ball()
                await ball.update_position()
                await ball.save_to_cache()
                await self.broadcast_ball_position(ball)
            except asyncio.CancelledError:
                print('Task cancelled')
                break
            except Exception as e:
                print(f'Error in send_ball_position with game:{self.game_id}: {e}')
            finally:
                await asyncio.sleep(0.02)

    async def get_or_create_ball(self):
        ball_state = await Ball.load_from_cache(self.game_id)
        players = await Player.get_players_of_game(self.game_id)

        if not ball_state:
            return Ball(self.game_id, players[0], players[1])

        ball = Ball(self.game_id, players[0], players[1])
        ball.x, ball.y, ball.vx, ball.vy = ball_state['x'], ball_state['y'], ball_state['vx'], ball_state['vy']
        return ball

    async def broadcast_ball_position(self, ball):
        message = {
            'type': 'ball_position',
            'event': 'ball_position',
            'x': ball.x,
            'y': ball.y,
            'message': 'ball_position_send'
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def move_player(self, data):
        player = await self.get_or_create_player(data['player_id'])
        player.move(data['direction'])
        await player.save_to_cache()
        await self.broadcast_player_move(player)

    async def get_or_create_player(self, player_id):
        player_state = await Player.load_from_cache(player_id, self.game_id)
        if player_state:
            player = Player(player_id, self.game_id)
            player.y = player_state['y']
            player.score = player_state['score']
        else:
            player = Player(player_id, self.game_id)
        return player

    async def _redis_listener(self):
        try:
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    await self.handle_redis_message(message['data'])
        except asyncio.CancelledError:
            return

    async def handle_redis_message(self, data):
        if data == b"score_updated":
            await self.handle_score_update()
        elif data.startswith(b"game_finish_"):
            await self.handle_game_finish(data)

    async def handle_score_update(self):
        players = await Player.get_players_of_game(self.game_id)
        scores = [players[0].score, players[1].score]
        await self.send_score_update(scores)

    async def handle_game_finish(self, data):
        winning_session = data.decode().split('_')[-1]
        if hasattr(self, 'send_ball_task'):
            self.send_ball_task.cancel()

        game = await self.get_game_from_cache(self.game_id)
        game['status'] = 'FINISHED'
        await self.set_game_to_cache(self.game_id, game)

        await self.send_game_finish(winning_session)

        self.remove_game_from_cache(self.game_id)
        await self.cleanup()

    # Helper methods
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
                return None
            if game['player1'] == player_id:
                game['player1_ready'] = True
            elif game['player2'] == player_id:
                game['player2_ready'] = True
            cache.set(cache_key, game, timeout=60 * 30)
            return Player(player_id, self.game_id)

    @database_sync_to_async
    def remove_game_from_cache(self, game_id):
        cache.delete(f'game_{game_id}')

    async def set_game_to_cache(self, game_id, game_data):
        cache = caches['default']
        await sync_to_async(cache.set)(f'game_{game_id}', game_data, timeout=60 * 30)

    # WebSocket event handlers
    async def player_connected(self, event):
        message = {
            'type': 'player_connected',
            'player_id': event['player_id'],
            'player_name': event['player_name'],
            'player_avatar': event['player_avatar'],
        }
        await self.send(text_data=json.dumps(message))

    async def broadcast_player_move(self, player):
        message = {
            'type': 'player_move',
            'event': 'player_move',
            'y': player.y,
            'player_id': player.player_id
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_game_cancel(self, player_id):
        message = {
            'type': 'game_cancel',
            'player_id': player_id
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def broadcast_game_start(self, game):
        p1_is_me = True if self.player_id == game['player1'] else False
        message = {
            'type': 'game_start',
            'main_player_id': game['player1'] if p1_is_me else game['player2'],
            'opponent_id': game['player2'] if p1_is_me else game['player1'],
            'main_player_name': game['player1_name'] if p1_is_me else game['player2_name'],
            'opponent_name': game['player2_name'] if p1_is_me else game['player1_name'],
            'player_nb': 1 if p1_is_me else 2,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def game_cancel(self, event):
        message = {
            'type': 'game_cancel',
            'p_id': event['player_id']
        }
        await self.send(text_data=json.dumps(message))

    async def notify_countdown(self, countdown):
        message = {
            'type': 'countdown',
            'countdown': countdown,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def countdown(self, event): 
        message = {
            'type': 'countdown',
            'countdown': event['countdown'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_ready(self, event):
        message = {
            'type': 'player_ready',
            'player_id': event['player_id'],
        }
        await self.send(text_data=json.dumps(message))

    async def game_start(self, event):
        message = {
            'type': 'game_start',
            'main_player_id': event['main_player_id'],
            'opponent_id': event['opponent_id'],
            'main_player_name': event['main_player_name'],
            'opponent_name': event['opponent_name'],
            'player_nb': event['player_nb'],
        }
        await self.send(text_data=json.dumps(message))

    async def ball_position(self, event):
        message = {
            'x': event['x'],
            'y': event['y'],
            'type': event['type']
        }
        await self.send(text_data=json.dumps(message))

    async def player_move(self, event):
        message = {
            'y': event['y'],
            'type': event['type'],
            'player_id': event['player_id']
        }
        await self.send(text_data=json.dumps(message))

    async def score_update(self, event):
        message = {
            'type': event['type'],
            'score': event['scores']
        }
        await self.send(text_data=json.dumps(message))

    async def player_disconnected(self, event):
        message = {
            'type': event['type'],
            'player_id': event['player_id']
        }
        await self.send(text_data=json.dumps(message))

    async def game_finish(self, event):
        message = {
            'type': 'game_finish',
            'winning_session': event['winning_session']
        }
        await self.send(text_data=json.dumps(message))

    async def send_score_update(self, scores):
        message = {
            'type': 'score_update',
            'scores': scores
        }
        await self.send(text_data=json.dumps(message))

    async def send_game_finish(self, winning_session):
        message = {
            'type': 'game_finish',
            'winning_session': winning_session,
            'message': 'game_is_over'
        }
        await self.channel_layer.group_send(self.game_group_name, message)
        # await self.send(text_data=json.dumps(message))

    async def send_players_info(self, game):
        message =  {
            'type': 'players_info',
            'player1': game['player1'],
            'player1_name': game['player1_name'],
            'player1_ready': game['player1_ready'],
            'player1_avatar': game['player1_avatar'],
            'player2': game['player2'],
            'player2_name': game['player2_name'],
            'player2_ready': game['player2_ready'],
            'player2_avatar': game['player2_avatar'],
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def players_info(self, event):
        message = {
            'type': 'players_info',
            'player1': event['player1'],
            'player1_name': event['player1_name'],
            'player1_ready': event['player1_ready'],
            'player1_avatar': event['player1_avatar'],
            'player2': event['player2'],
            'player2_name': event['player2_name'],
            'player2_ready': event['player2_ready'],
            'player2_avatar': event['player2_avatar'],
        }
        await self.send(text_data=json.dumps(message))
        