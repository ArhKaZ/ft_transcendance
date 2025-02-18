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
from .game import PongGame
from .server import pong_server

class PongConsumer(AsyncWebsocketConsumer):
	def __init__(self, *args,  **kwargs):
		super().__init__(*args, **kwargs)
		self.listen_task = None
		self.countdown_task = None
		self._countdown_done = asyncio.Event()
		self.send_ball_task = None
		self.cleanup_lock = asyncio.Lock()
		self.is_cleaning_up = False
		self.in_tournament = False
		self.game = None
		self.game_id = None

	async def connect(self):
		self.player_id = int(self.scope['url_route']['kwargs']['player_id'])
		await pong_server.register_connection(self.player_id, self.channel_name)
		await self.accept()

	async def disconnect(self, close_code):
		try:
			await asyncio.wait_for(self._handle_disconnect(close_code), timeout=5)
		except asyncio.TimeoutError:
			print("Disconnect operation timed out")
		except Exception as e:
			print(f"Error during disconnect: {e}")

	async def _handle_disconnect(self, close_code):
		if self.game_id:
			await pong_server.cleanup_player(self.player_id, self.username, self.game_id)
		await self.cleanup()

	async def cleanup(self):
		async with self.cleanup_lock:
			if self.is_cleaning_up:
				return
			self.is_cleaning_up = True

			try:
				tasks = [self.listen_task, self.send_ball_task, self.countdown_task]
				if tasks:
					for task in tasks:
						if task and not task.done():
							task.cancel()
					await asyncio.wait([task for task in tasks if task], timeout=5)

				if hasattr(self, 'pubsub'):
					try:
						await asyncio.wait_for(
							self.pubsub.unsubscribe(f"game_update:{self.game_id}"),
							timeout=2
						)
					except Exception as e:
						print(f"Error unsubscribing from pubsub: {e}")

				if hasattr(self, 'redis'):
					try:
						await asyncio.wait_for(self.redis.close(), timeout=2)
					except Exception as e:
						print(f"Error closing Redis connection: {e}")

				if self.game and hasattr(self.game, 'group_name'):		
					await self.channel_layer.group_discard(self.game.group_name, self.channel_name)
			except Exception as e:
				print(f"Error during cleanup: {e}")
			finally:
				self.is_cleaning_up = False
				self.game = None

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			action = data['action']

			actions = {
				'ready': self.handle_player_ready,
				'move': self.move_player,
				'search': self.handle_player_search,
				'findGame': self.handle_find_game,
				'tournament': self.handle_tournament_game,
			}

			handler = actions.get(action)
			if handler:
				await handler(data)
			else:
				print(f"Unknown action: {action}")
		except json.JSONDecodeError:
			print("Invalid JSON received")
		except Exception as e:
			print(f"Error processing message: {e}")

	async def initialize_listener(self):
		try:
			self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
			self.pubsub = self.redis.pubsub()
			print(f'pubsub initialized: {self.pubsub}')
			await self.pubsub.subscribe(f"game_update:{self.game_id}")
			return True
		except Exception as e:
			print(f"Failed to initialize Redis Listener : {e}")
			return False

# GAME INIT
	async def handle_tournament_game(self, data):
		if data['create'] == 'false':
			await asyncio.sleep(0.1)
			player_game_key = f'player_current_game_{self.player_id}'
			current_game = await sync_to_async(cache.get)(player_game_key)
			if current_game:
				await self.handle_find_game({"game_id": current_game})
			else:
				await self.notify_need_wait(data)
			return

		player_info = {
			'id': self.player_id,
			'username': data['player_name'],
			'avatar': data['player_avatar'],
		}
		self.username = data['player_name']

		opponent_info = {
			'id': data['opponent']['id'],
			'username': data['opponent']['name'],
			'avatar': data['opponent']['avatar']
		}

		self.game, self.game_id = await pong_server.initialize_game(player_info, opponent_info)
		if self.game:
			await self._setup_game()

	async def handle_player_search(self, data): 
		player_game_key = f'player_current_game_{self.player_id}'
		current_game = await sync_to_async(cache.get)(player_game_key)

		if current_game:
			await self.send(text_data=json.dumps({
				'type': 'error',
				'message': 'You\'r already in a game'
			}))
			return
		
		player_info = {
				'id': self.player_id,
				'username': data['player_name'],
				'avatar': data['player_avatar'],
		}
		self.username = data['player_name']

		self.game, self.game_id = await pong_server.initialize_game(player_info)
		if self.game:
			await self._setup_game()
		else:
			await self.waiting_for_opponent()

	async def _setup_game(self):
		if not await self.initialize_listener():
			await self.close()
			return
		
		self.listen_task = asyncio.create_task(self._redis_listener())
		await self.channel_layer.group_add(self.game.group_name, self.channel_name)
		await self.send_players_info(self.game.to_dict())

		asyncio.create_task(self._watch_game_events())

	async def _watch_game_events(self):
		try:
			while True:
				if await self._wait_for_event(self.game.events['game_cancelled']):
					print(f"Game cancelled for player {self.player_id}")
					break

				if await self._wait_for_event(self.game.events['game_finished']):
					print(f"Game finished for player {self.player_id}")
					break
				
				await asyncio.sleep(0.1)
		except Exception as e:
			print(f"Error in game events watcher: {e}")
		finally:
			await pong_server.cleanup_player(self.player_id, self.username, self.game_id)

	async def _wait_for_event(self, event):
		try:
			return await asyncio.wait_for(event.wait(), timeout=0.1)
		except asyncio.TimeoutError:
			return False

	async def handle_find_game(self, data):
		if self.game is None:
			self.game_id = data['game_id']
			self.game = await pong_server.get_game(self.game_id)
			if self.game:
				await self._setup_game()

	async def handle_find_game_message(self, event):
		await self.handle_find_game({
			'game_id': event['game_id']
		})

# READY 
	async def handle_player_ready(self, data):
		if not self.game:
			return

		both_r = await self.game.set_player_ready(self.player_id)
		await self.notify_player_ready()
		if both_r:
			await self.start_game_sequence()

	async def start_game_sequence(self):
		await self.notify_game_start(self.game.p1, self.game.p2)
		self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
		asyncio.create_task(self.launch_game_after_countdown())

	async def launch_game_after_countdown(self):
		await self._countdown_done.wait()
		if not self.send_ball_task and not self.game.events['game_cancelled'].is_set():
			game_state = await self.game.start_game()
			if game_state:
				self.send_ball_task = asyncio.create_task(self.send_ball_position())

	async def run_countdown_sequence(self):
		for count in range(3, -1, -1):
			if self.game.events['game_cancelled'].is_set():
				break
			await self.notify_countdown(count)
			if count > 0:
				await asyncio.sleep(1)
			elif count == 0:
				await asyncio.sleep(2)
		self._countdown_done.set()

	async def send_ball_position(self):
		while self.game:
			try:
				async for game_state in self.game.ball_position_updates():
					if self.game.events['game_cancelled'].is_set():
						break
					await self.notify_ball_position(game_state)
					await asyncio.sleep(0.5)
			except asyncio.CancelledError:
				print('send ball cancelled')
			except Exception as e:
				print(f'Error in send_ball_position: {e}')

	async def move_player(self, data):
		if not self.game and not self.game.can_move:
			return
		if data['instruction'] == 'start':
			self.moving_direction = data['direction']
			asyncio.create_task(self.handle_continuous_movement())
			await self.notify_start_move(self.moving_direction)
		if data['instruction'] == 'stop':
			self.moving_direction = None
			await self.notify_stop_move()

	async def handle_continuous_movement(self):
		while (
			self.moving_direction 
			and not self.game.events['game_cancelled'].is_set()
			and not self.game.events['game_finished'].is_set()
		):
			player = await self.game.move_player(self.player_id, self.moving_direction)
			await asyncio.sleep(0.0166)

	async def _redis_listener(self):
		try:
			print(f'pubsub: {self.pubsub}')
			async for message in self.pubsub.listen():
				if self.game.events['game_cancelled'].is_set():
					break
				if message['type'] == 'message':
					await self.handle_redis_message(message['data'])
		except asyncio.CancelledError:
			print('Redis listenener cancelled')
		except Exception as e:
			print(f"Error in redis listener: {e}")
			if not self.is_cleaning_up:
				await self.cleanup()

	async def handle_redis_message(self, data):
		try:
			if data.startswith(b"score_updated_"):
				await self.handle_score_update(data)
			elif data.startswith(b"game_finish_"):
				self.game.can_move = False
				if not self.is_cleaning_up:
					await self.handle_game_finish(data)
		except Exception as e:
			print(f"Error in handle_redis_message: {e}")

	async def handle_score_update(self, data):
		p_as_score = data.decode().split('_')[-1]
		await self.notify_score_update([self.game.p1.score, self.game.p2.score], p_as_score)

	async def handle_game_finish(self, data):
		winning_session = data.decode().split('_')[-1]
		if hasattr(self, 'send_ball_task') and self.send_ball_task is not None:
			self.send_ball_task.cancel()

		self.game.status = 'FINISHED'
		await self.game.save_to_cache()

		await self.send_game_finish(winning_session)
		await self.cleanup()


	async def notify_start_move(self, direction):
		message = {
			'type': 'player_movement_start',
			'player_id': self.player_id, 
			'direction': direction
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_stop_move(self):
		player = self.game.p1 if self.game.p1.id == self.player_id else self.game.p2
		message = {
			'type': 'player_movement_stop',
			'player_id': self.player_id,
			'finalY': player.y
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_need_wait(self, data):
		message = {
			'type': 'waiting_tournament',
			'player_id': data['player_id'],
			'player_name': data['player_name'],
			'player_avatar': data['player_avatar'],
			'opponent': data['opponent'],
			'create': data['create'],
		}
		await self.send(text_data=json.dumps(message))


	async def notify_player_ready(self):
		player_number = 1 if self.player_id == self.game.p1.id else 2
		message = {
			'type': 'player_ready',
			'player_number': player_number,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_ball_position(self, state):
		message = {
			'type': 'ball_position',
			**state
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_score_update(self, scores, p_id):
		message = {
			'type': 'score_update',
			'scores': scores,
			'player_id': p_id,
		}
		await self.send(text_data=json.dumps(message))
		# await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_player_move(self, player):
		message = {
			'type': 'player_move',
			'y': player['y'],
			'player_id': player['id']
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_game_cancel(self, username_gone):
		message = {
			'type': 'game_cancel',
			'message': f'Player {username_gone} is gone, game is cancelled',
			'username': username_gone,
			'game_status': self.game.status
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_game_start(self, p1, p2):
		message = {
			'type': 'game_start',
			'player1_id': p1.id,
			'player1_name': p1.username,
			'player2_id': p2.id,
			'player2_name': p2.username,
			'player1_avatar': p1.avatar,
			'player2_avatar': p2.avatar,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def player_movement_start(self, event):
		message = {
			'type': event['type'],
			'player_id': event['player_id'],
			'direction': event['direction']
		}
		await self.send(text_data=json.dumps(message))

	async def player_movement_stop(self, event):
		message = {
			'type': event['type'],
			'player_id': event['player_id'],
			'finalY': event['finalY']
		}
		await self.send(text_data=json.dumps(message))

	async def game_cancel(self, event):
		message = {
			'type': 'game_cancel',
			'message': event['message'],
			'username': event['username'],
			'game_status': event['game_status']
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
			'player_number': event['player_number'],
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
			'vx': event['vx'],
			'vy': event['vy'],
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
		await self.send(text_data=json.dumps({
			'type': 'game_finish',
			'winning_session': event['winning_session']
		}))

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
		# await self.channel_layer.group_send(self.game.group_name, message)
		await self.send(text_data=json.dumps(message))

	async def send_players_info(self, game):
		message =  {
			'type': 'players_info',
			'game_id': game['id'],
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