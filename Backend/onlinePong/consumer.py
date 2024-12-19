import asyncio
import json
import aioredis
import uuid

from asgiref.sync import sync_to_async
from django.conf import settings
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from rest_framework_simplejwt.authentication import JWTAuthentication
from .ball import Ball
from .player import Player
from .game import Game


class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args,  **kwargs):
        super().__init__(*args, **kwargs)
        self.listen_task = None
        self.countdown_task = None
        self._countdown_done = asyncio.Event()
        self.send_ball_task = None
        self.ball_reset_event = asyncio.Event()
        self.ball_reset_event.set()
        self.can_move = asyncio.Event()
        self.can_move.set()
        self.game = None
        self.game_id = None

    async def connect(self):
        self.player_id = self.scope['url_route']['kwargs']['player_id']

        previous_channel = cache.get(f"player_{self.player_id}_channel")
        if previous_channel:
            await self.channel_layer.group_discard("onlinePong_players", previous_channel)

        cache.set(f"player_{self.player_id}_channel", self.channel_name)

        await self.channel_layer.group_add("onlinePong_players", self.channel_name)
        await self.accept()

        # query_string = self.scope["query_string"].decode()
        # token = self.get_token_from_query(query_string)

        # if not token:
        #     await self.close()
        #     print("Error no token")
        #     return

        # user = await self.get_user_from_token(token)

        # if not user or str(user.id) != user.id:
        #     await self.close()
        #     print('Error with user auth')
        #     return
        
        # self.user = user
        # print(self.user)
        # self.player_id = player_id

    # Disconnect functions
    async def disconnect(self, close_code):
        print(f"Disconnect player {self.player_id} from game {self.game_id}")
        await self.notify_game_cancel(self.player_id)
        await self.cleanup()
        await self.handle_disconnect()

    async def cleanup(self):
        if hasattr(self, 'listen_task'):
            self.listen_task.cancel()
        if hasattr(self, 'pubsub'):
            await self.pubsub.unsubscribe(f"game_update:{self.game_id}")
        if hasattr(self, 'redis'):
            await self.redis.close()
        await self.channel_layer.group_discard(self.game.group_name, self.channel_name)

    async def handle_disconnect(self):
        print(f"Handling disconnect from player {self.player_id} from game {self.game_id}")

        await self.remove_game_from_cache(False)
        print(f"Game {self.game_id} removed from cache")
        return

    async def initialize_listener(self):
        self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(f"game_update:{self.game_id}")
        return True


    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data['action']

        actions = {
            'ready': self.handle_player_ready,
            'move': self.move_player,
            'search': self.set_player_search,
        }

        handler = actions.get(action)
        if handler:
            await handler(data)


# GAME INIT
    async def set_player_search(self, data):
        key = 'waiting_onlinePong_players'

        current_waiting_players = cache.get(key) or []

        player_info = {
                'id': self.player_id,
                'username': data['player_name'],
                'avatar': data['player_avatar'],
        }

        if not any(player['id'] == self.player_id for player in current_waiting_players):
            current_waiting_players.append(player_info)
            await sync_to_async(cache.set)(key, current_waiting_players)


        await self.waiting_for_opponent()
        # await self.send(text_data=json.dumps({
        #     "action": "search", 
        #     "message": "add to waiting room"
        # }))
        
        opponent_info = await self.find_oppenent()
        if opponent_info is not None:
            await self.create_game(player_info, opponent_info)

    async def find_oppenent(self):
        key = 'waiting_onlinePong_players'

        current_waiting_players = cache.get(key) or []

        current_waiting_players  = list(
            filter(lambda player: player['id'] != self.player_id, current_waiting_players)
        )

        if current_waiting_players:
            opponent_info = current_waiting_players.pop(0)
            await sync_to_async(cache.set)(key, current_waiting_players)

            return opponent_info
        else:
            return None

    async def create_game(self, player_info, opponent_info):
        self.game = Game(player_info, opponent_info)
        await self.game.save_to_cache()
        self.game_id = self.game.get_game_id()
        opponent_channel_name = cache.get(f"player_{opponent_info['id']}_channel")
        await self.channel_layer.group_add(self.game.group_name, self.channel_name)

        if opponent_channel_name:
            await self.channel_layer.group_add(self.game.group_name, opponent_channel_name)

        if not await self.initialize_listener():
            await self.close()
            return
        self.listen_task = asyncio.create_task(self._redis_listener())
        await self.send_players_info(self.game.to_dict())

# READY 
    async def handle_player_ready(self, data):
        if self.game_id is None:
            self.game_id = data['game_id']
            self.game = await Game.get_game_from_cache(self.game_id)
            if not await self.initialize_listener():
                await self.close()
                return
            self.listen_task = asyncio.create_task(self._redis_listener())
        await self.async_set_player_ready()
        message = {
            'type': 'player_ready',
            'player_id': self.player_id
        }
        await self.channel_layer.group_send(self.game.group_name, message)
        await self.check_both_ready()

    async def check_both_ready(self):
        async with asyncio.Lock():
            if self.game.both_players_ready():
                self.game.status = 'IN_PROGRESS'
                await self.game.save_to_cache()
                await self.notify_game_start(self.game.to_dict())
                await self.set_can_move_in_cache(False)
                if not self.countdown_task:
                    self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
                asyncio.create_task(self.launch_game_after_countdown())


    async def set_can_move_in_cache(self, value):
        await sync_to_async(cache.set)(f'can_move_{self.game_id}', value)

    async def get_can_move_in_cache(self):
        return await sync_to_async(cache.get)(f'can_move_{self.game_id}')

    async def launch_game_after_countdown(self):
        await self._countdown_done.wait()
        if not self.send_ball_task:
            self.send_ball_task = asyncio.create_task(self.send_ball_position())

    async def run_countdown_sequence(self):
        for count in range(3, -1, -1):
            await self.notify_countdown(count)
            if count > 0:
                await asyncio.sleep(1)
            elif count == 0:
                await asyncio.sleep(2)
        await self.set_can_move_in_cache(True)
        self._countdown_done.set()

    async def send_ball_position(self):
        while True:
            try:
                await self.ball_reset_event.wait()

                ball = await self.get_or_create_ball()

                if ball.is_resetting:
                    ball.is_resetting = False
                    await ball.save_to_cache()

                    self.ball_reset_event.clear()
                    asyncio.create_task(self.reset_delay())
                    continue

                bound_wall, bound_player = await ball.update_position()
                await ball.save_to_cache()
                await self.notify_ball_position(ball, bound_wall, bound_player)
            except asyncio.CancelledError:
                print('Task cancelled')
                break
            except Exception as e:
                print(f'Error in send_ball_position with game:{self.game_id}: {e}')
                self.cleanup()
                return
            finally:
                await asyncio.sleep(0.02)

    async def reset_delay(self):
        await self.set_can_move_in_cache(False)
        await asyncio.sleep(1)
        await self.set_can_move_in_cache(True)
        self.ball_reset_event.set()

    async def get_or_create_ball(self):
        ball_state = await Ball.load_from_cache(self.game_id)
        players = await Player.get_players_of_game(self.game_id)

        if not ball_state:
            return Ball(self.game_id, players[0], players[1])

        ball = Ball(self.game_id, players[0], players[1])
        ball.x = ball_state['x']
        ball.y = ball_state['y']
        ball.vx = ball_state['vx']
        ball.vy = ball_state['vy']
        ball.is_resetting = ball_state.get('is_resetting', False)
        return ball

    async def notify_ball_position(self, ball, bound_wall, bound_player):
        message = {
            'type': 'ball_position',
            'x': ball.x,
            'y': ball.y,
            'bound_wall': bound_wall, 
            'bound_player': bound_player,
        }
        await self.channel_layer.group_send(self.game.group_name, message)

    async def move_player(self, data):
        is_set = await self.get_can_move_in_cache()
        if not is_set:
            return
        player = await self.get_or_create_player(data['player_id'])
        player.move(data['direction'])
        await player.save_to_cache()
        await self.notify_player_move(player)

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
        print("score update data:", data)
        if data.startswith(b"score_updated_"):
            await self.handle_score_update(data)
        elif data.startswith(b"game_finish_"):
            await self.set_can_move_in_cache(False)
            await self.handle_game_finish(data)

    async def handle_score_update(self, data):
        print('update score function')
        p_as_score = data.decode().split('_')[-1]
        players = await Player.get_players_of_game(self.game_id)
        scores = []
        if players[0].id == self.game.p1_id:
            scores[0] = players[0].score
        if players[1].id == self.game.p1_id:
            scores[0] = players[1].score
        if players[0].id == self.game.p2_id:
            scores[1] = players[0].score
        if players[1].id == self.game.p2_id:
            scores[1] = players[1].score
        print("score:", scores)
        await self.notify_score_update(scores, p_as_score)

    async def handle_game_finish(self, data):
        winning_session = data.decode().split('_')[-1]
        if hasattr(self, 'send_ball_task'):
            self.send_ball_task.cancel()

        self.game.status = 'FINISHED'
        await self.game.save_to_cache()

        await self.send_game_finish(winning_session)

        await self.remove_game_from_cache(True)
        await self.cleanup()

    # Helper methods
    @database_sync_to_async
    def get_game_from_cache(self, game_id):
        return cache.get(f'game_{game_id}')

    async def async_set_player_ready(self):
        player = await self.set_player_ready()
        if player:
            await player.save_to_cache()

    async def set_player_ready(self): 
        await self.game.set_a_player_ready(self.player_id)
        return Player(self.player_id, self.game_id)

    @database_sync_to_async
    def remove_game_from_cache(self, game_finished):
        data = {
            'player_name': self.game.p1_username if self.player_id == self.game.p1_id else self.game.p2_username,
            'player_avatar': self.game.p1_avatar if self.player_id == self.game.p1_id else self.game.p2_avatar
        }
        self.game.remove_from_cache()
        self.game = None
        self.game_id = None
        if not game_finished:
            self.set_player_search(data)

    async def set_game_to_cache(self, game_id, game_data):
        cache = caches['default']
        await sync_to_async(cache.set)(f'game_{game_id}', game_data, timeout=60 * 30)

    async def notify_player_move(self, player):
        message = {
            'type': 'player_move',
            'event': 'player_move',
            'y': player.y,
            'player_id': player.player_id
        }
        await self.channel_layer.group_send(self.game.group_name, message)

    async def notify_game_cancel(self, player_id):
        message = {
            'type': 'game_cancel',
            'player_id': player_id
        }
        await self.channel_layer.group_send(self.game.group_name, message)

    async def notify_game_start(self, game):
        message = {
            'type': 'game_start',
            'player1_id': game['p1_id'],
            'player1_name': game['p1_username'],
            'player2_id': game['p2_id'],
            'player2_name': game['p2_username'],
            'player1_avatar': game['p1_avatar'],
            'player2_avatar': game['p2_avatar'],
        }
        await self.channel_layer.group_send(self.game.group_name, message)

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
        await self.channel_layer.group_send(self.game.group_name, message)

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
            'player1_id': event['player1_id'],
            'player1_name': event['player1_name'],
            'player2_id':  event['player2_id'],
            'player2_name': event['player2_name'],
            'player1_avatar': event['player1_avatar'],
            'player2_avatar': event['player2_avatar'],
        }
        await self.send(text_data=json.dumps(message))

    async def ball_position(self, event):
        message = {
            'x': event['x'],
            'y': event['y'],
            'type': event['type'],
            'bound_wall': event['bound_wall'],
            'bound_player': event['bound_player'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_move(self, event):
        message = {
            'y': event['y'],
            'type': event['type'],
            'player_id': event['player_id']
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

    async def notify_score_update(self, scores, p_id):
        print(scores)
        message = {
            'type': 'score_update',
            'scores': scores,
            'player_id': p_id,
        }
        await self.send(text_data=json.dumps(message))
        # await self.channel_layer.group_send(self.game.group_name, message)

    async def score_update(self, event):
        message = {
            'type': event['type'],
            'score': event['scores'],
            'player_id': event['player_id']
        }
        await self.send(text_data=json.dumps(message))

    async def send_game_finish(self, winning_session):
        message = {
            'type': 'game_finish',
            'winning_session': winning_session,
            'message': 'game_is_over'
        }
        await self.channel_layer.group_send(self.game.group_name, message)
        # await self.send(text_data=json.dumps(message))

    async def send_players_info(self, game):
        message =  {
            'type': 'players_info',
            'game_id': str(game['id']),
            'player1': game['p1_id'],
            'player1_name': game['p1_username'],
            'player1_ready': game['p1_ready'],
            'player1_avatar': game['p1_avatar'],
            'player2': game['p2_id'],
            'player2_name': game['p2_username'],
            'player2_ready': game['p2_ready'],
            'player2_avatar': game['p2_avatar'],
        }
        await self.channel_layer.group_send(self.game.group_name, message)

    async def players_info(self, event):
        message = {
            'type': 'players_info',
            'game_id': event['game_id'],
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

    async def waiting_for_opponent(self):
        message = {
            'type': 'waiting',
            'message': 'You\'r waiting for an opponent'
        }
        await self.send(text_data=json.dumps(message))