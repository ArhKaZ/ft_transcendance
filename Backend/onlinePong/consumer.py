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
		self.cleanup_lock = asyncio.Lock()
		self.is_cleaning_up = False
		self.game_cancel_event = asyncio.Event()
		self.in_tournament = False

	async def connect(self):
		self.player_id = int(self.scope['url_route']['kwargs']['player_id'])
		previous_channel = cache.get(f"player_{self.player_id}_channel")
		if previous_channel:
			await self.channel_layer.group_discard("onlinePong_players", previous_channel)

		cache.set(f"player_{self.player_id}_channel", self.channel_name)

		await self.channel_layer.group_add("onlinePong_players", self.channel_name)
		await self.accept()

	async def disconnect(self, close_code):
		try:
			await asyncio.wait_for(self._handle_disconnect(close_code), timeout=5)
		except asyncio.TimeoutError:
			print("Disconnect operation timed out")
		except Exception as e:
			print(f"Error during disconnect: {e}")

	async def _handle_disconnect(self, close_code):
		print(f"Disconnect player {self.player_id} from game {self.game_id}")
		
		key = 'waiting_onlinePong_players'
		current_waiting_players = await sync_to_async(cache.get)(key) or []
		current_waiting_players = [p for p in current_waiting_players if p['id'] != self.player_id]
		await sync_to_async(cache.set)(key, current_waiting_players)
		if self.game_id:
			await sync_to_async(cache.delete)(f'player_current_game_{self.player_id}')
			await sync_to_async(cache.delete)(f"player_{self.player_id}_channel")

			if self.game:
				print(f'disconnect: there is a game : {self.game.status}')
				username_gone = self.game.p1.username if self.player_id == self.game.p1.id else self.game.p2.username
				await self.notify_game_cancel(username_gone)
				
				if self.game.status == "WAITING":
					await sync_to_async(cache.delete)(f'game_pong_{self.game_id}')
				else:
					await self.game.handle_player_disconnect(self.player_id)
			
			self.game_cancel_event.set()
			await self.cleanup()

	async def cleanup(self):
		async with self.cleanup_lock:
			if self.is_cleaning_up:
				return
			self.is_cleaning_up = True

			try:
				self.game_cancel_event.set()
				self._countdown_done.set()
				self.ball_reset_event.set()
				self.can_move.set()

				tasks = [
					(self.listen_task),
					(self.send_ball_task),
					(self.countdown_task)
				]

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
				# Nettoyage du cache
				cache_keys = [
					f"player_{self.player_id}",
					f"game_pong_{self.game_id}",
					f"player_current_game_{self.player_id}",
					f"can_move_{self.game_id}"
				]
				
				for key in cache_keys:
					await sync_to_async(cache.delete)(key)

			except asyncio.CancelledError:
				print("Cleanup was cancelled while waiting lock")
			except Exception as e:
				print(f"Error during cleanup: {e}")
				print(f"Error details:", str(e))
			finally:
				self.is_cleaning_up = False
				self.game = None

	async def initialize_listener(self):
		try:
			self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
			self.pubsub = self.redis.pubsub()
			await self.pubsub.subscribe(f"game_update:{self.game_id}")
			return True
		except Exception as e:
			print(f"Failed to initialize Redis Listener : {e}")

	async def receive(self, text_data):
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

		await self.create_a_game(player_info, opponent_info)

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

		key = 'waiting_onlinePong_players'

		current_waiting_players = cache.get(key) or []
	
		if not any(player['id'] == self.player_id for player in current_waiting_players):
			current_waiting_players.append(player_info)
			await sync_to_async(cache.set)(key, current_waiting_players)

		opponent_info = await self.find_oppenent()
		
		if opponent_info:
			await self.create_a_game(player_info, opponent_info)	

			if not self.in_tournament:
				key = 'waiting_onlinePong_players'
				current_waiting_players = await sync_to_async(cache.get)(key) or []
				current_waiting_players = [p for p in current_waiting_players if p['id'] != self.player_id]
				await sync_to_async(cache.set)(key, current_waiting_players)
		else:
			await self.waiting_for_opponent()

	async def find_oppenent(self):
		key = 'waiting_onlinePong_players'

		current_waiting_players = cache.get(key) or []

		current_waiting_players  = list(
			filter(lambda player: player['id'] != self.player_id, current_waiting_players)
		)

		if current_waiting_players:
			opponent_info = current_waiting_players.pop(0)
			await sync_to_async(cache.set)(key, current_waiting_players)
			print(opponent_info)
			return opponent_info
		else:
			return None

	async def create_a_game(self, player_info, opponent_info): 
		self.game_id = str(uuid.uuid4())
		await sync_to_async(cache.set)(f'player_current_game_{self.player_id}', self.game_id, timeout=1800)
		await sync_to_async(cache.set)(f'player_current_game_{opponent_info["id"]}', self.game_id, timeout=1800)
	
		self.game = Game(player_info, opponent_info, self.game_id)
		await self.game.save_to_cache()

		if not await self.initialize_listener():
			await self.close()
			return

		self.listen_task = asyncio.create_task(self._redis_listener())

		await self.channel_layer.group_add(self.game.group_name, self.channel_name)
		opponent_channel_name = cache.get(f"player_{opponent_info['id']}_channel")
		if opponent_channel_name:
			await self.channel_layer.group_add(self.game.group_name, opponent_channel_name)

		await self.send_players_info(self.game.to_dict())

	async def handle_find_game(self, data):
		if self.game is None:
			self.game_id = data['game_id']
			self.game = await Game.get_game_from_cache(self.game_id)
			if self.in_tournament:
				print('send info', self.player_id)
				await self.send_players_info(self.game.to_dict())
			if not await self.initialize_listener():
				await self.close()
				return
			
			self.listen_task = asyncio.create_task(self._redis_listener())

# READY 
	async def handle_player_ready(self, data):
		await self.game.set_a_player_ready(self.player_id)
		await self.notify_player_ready()
		await self.check_both_ready()

	async def check_both_ready(self):
		async with asyncio.Lock():
			if self.game.both_players_ready():
				await self.start_game_sequence()
			else:
				print('there is a problem')

	async def start_game_sequence(self):
		self.game.status = "IN_PROGRESS"
		await self.game.save_to_cache()

		await self.notify_game_start(self.game.p1, self.game.p2)
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
			print('status_game: ', self.game.status)
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
				if self.game_cancel_event.is_set():
					break
				self.game.reset_bounds()
				await self.ball_reset_event.wait()
				if self.game.ball.is_resetting:
					self.game.ball.is_resetting = False
					await self.game.ball.save_to_cache()
					self.ball_reset_event.clear()
					asyncio.create_task(self.reset_delay())
					continue
				await self.game.ball.update_position(self.game)
				await self.notify_ball_position()
				await asyncio.sleep(0.01)
			except asyncio.CancelledError:
				print('Task cancelled')
				break
			except Exception as e:
				print(f'Error in send_ball_position with game:{self.game_id}: {e}')
				await self.cleanup()
				return
	
	async def reset_delay(self):
		await self.set_can_move_in_cache(False)
		await asyncio.sleep(1)
		await self.set_can_move_in_cache(True)
		self.ball_reset_event.set()

	async def move_player(self, data):
		is_set = await self.get_can_move_in_cache()
		if not is_set:
			return
		player = await self.game.move_player(data['player_id'], data['direction'])
		await self.notify_player_move(player)

	async def _redis_listener(self):
		try:
			async for message in self.pubsub.listen():
				if self.game_cancel_event.is_set():
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
				await self.set_can_move_in_cache(False)
				if not self.is_cleaning_up:
					await self.handle_game_finish(data)
		except Exception as e:
			print(f"Error in handle_redis_message: {e}")

	async def handle_score_update(self, data):
		p_as_score = data.decode().split('_')[-1]
		await self.game.update_game()
		await self.notify_score_update([self.game.p1.score, self.game.p2.score], p_as_score)

	async def handle_game_finish(self, data):
		winning_session = data.decode().split('_')[-1]
		if hasattr(self, 'send_ball_task') and self.send_ball_task is not None:
			self.send_ball_task.cancel()

		self.game.status = 'FINISHED'
		await self.game.save_to_cache()

		await self.send_game_finish(winning_session)
		print('in game finish', self.listen_task)
		await self.cleanup()

	async def set_game_to_cache(self, game_id, game_data):
		cache = caches['default']
		await sync_to_async(cache.set)(f'game_{game_id}', game_data, timeout=60 * 30)

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
		player_number = 0
		if self.player_id == self.game.p1.id:
			player_number = 1
		else:
			player_number = 2
		message = {
			'type': 'player_ready',
			'player_number': player_number,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_ball_position(self):
		message = {
			'type': 'ball_position',
			'x': self.game.ball.x,
			'y': self.game.ball.y,
			'bound_wall': self.game.bound_wall, 
			'bound_player': self.game.bound_player,
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
		print('notify_game_start')
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

	# async def waiting_tournament(self, event):
	# 	message = {
	# 		'type': 'waiting_tournament',
	# 		'player_id': event['player_id'],
	# 		'player_name': event['player_name'],
	# 		'player_avatar': event['player_avatar'],
	# 		'in_tournament': event['in_tournament'],
	# 		'opponent': event['opponent'],
	# 		'create': event['createGame'],
	# 	}
		# await self.send(text_data=json.dumps(message))

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