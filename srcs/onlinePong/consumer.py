import asyncio
import json
import aioredis
import time

from asgiref.sync import sync_to_async
from django.conf import settings
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from api.models import MyUser, MatchHistory, Tournament

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
		self._countdown_task = None
		self.tournament_code = None
		self.is_final_match = False
		self.solo_task = None

	async def connect(self):
		self.player_id = int(self.scope['url_route']['kwargs']['player_id'])
		await pong_server.register_connection(self.player_id, self.channel_name)
		await self.accept()

	async def disconnect(self, close_code):
		try:
			await asyncio.wait_for(self._handle_disconnect(close_code), timeout=15)
		except asyncio.TimeoutError:
			print("Disconnect operation timed out")
		except Exception as e:
			print(f"Error during disconnect: {e}")

	async def _handle_disconnect(self, close_code):
		await self.stop_game_db()
		if self.game_id and self.game and not self.game.events['game_finished'].is_set():
			if self.game_id not in pong_server._game_locks:
				pong_server._game_locks[self.game_id] = asyncio.Lock()
				async with pong_server._game_locks[self.game_id]:
					if not await pong_server.game_is_stocked(self.game_id) and self.game.p1 and self.game.p2:
						winner_user, loser_user = await self.get_players_users(True)
						if await self.update_stats_and_create_matches(winner_user, loser_user, True):
							await pong_server.stock_game(self.game_id)
			await pong_server.cleanup_player(self.player_id, self.username, self.game_id, False)
		await self.cleanup()

	async def cleanup(self):
		async with self.cleanup_lock:
			if self.is_cleaning_up:
				return
			self.is_cleaning_up = True
			try:
				tasks = [
				t for t in [self.listen_task, self.send_ball_task, 
						   self.countdown_task, self.solo_task] 
				if t is not None
				]
	
				if tasks:
					for task in tasks:
						if not task.done():
							task.cancel()
					pending = [t for t in tasks if not t.done()]
					if pending:
						await asyncio.wait(pending, timeout=5)

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
				
				await pong_server.remove_player_from_waiting(self.player_id, True)
			except Exception as e:
				print(f"Error during cleanup: {e}")
			finally:
				self.is_cleaning_up = False
				self.game = None
				game_id = self.game_id
				if game_id and game_id in pong_server._game_locks:
					pong_server._game_locks[game_id] = None

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
		except json.JSONDecodeError:
			print("Invalid JSON received")
		except Exception as e:
			print(f"Error processing message: {e}")

	async def initialize_listener(self):
		try:
			self.redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
			self.pubsub = self.redis.pubsub()
			await self.pubsub.subscribe(f"game_update:{self.game_id}")
			return True
		except Exception as e:
			return False

	@database_sync_to_async
	def waiting_game_db(self):
		user = MyUser.objects.get(id=self.player_id)
		user.start_looking_game('Pong')

	@database_sync_to_async
	def start_game_db(self):
		user = MyUser.objects.get(id=self.player_id)
		user.start_game('Pong')

	@database_sync_to_async
	def stop_game_db(self):
		user = MyUser.objects.get(id=self.player_id)
		user.stop_game()

	async def handle_tournament_game(self, data):
		self.is_final_match = data.get('is_final_match', False)
		self.in_tournament = True
		self.username = data['player_name']
		self.tournament_code = data['tournament_code']

		if not self.solo_task:
			self.solo_task = asyncio.create_task(self._check_connections_and_win())

		if data.get('create') == False:
			await asyncio.sleep(0.1)
			current_game = await pong_server.is_in_game(self.player_id)
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

		if 'opponent' not in data or not data['opponent']:
			await self.game_not_launch()
			return

		opponent_info = {
			'id': data['opponent']['id'],
			'username': data['opponent']['name'],
			'avatar': data['opponent']['avatar']
		}

		if opponent_info is None:
			return
		self.game, self.game_id = await pong_server.initialize_game(True, player_info, opponent_info)
		if self.game:
			await self._setup_game()

	async def _check_connections_and_win(self):
		await asyncio.sleep(1200)
		try:
			if len(pong_server.active_connections) <= 1:
				tournament = await sync_to_async(Tournament.objects.get)(code=self.tournament_code)
				winner_exists = await sync_to_async(tournament.winner.exists)()

				if not winner_exists:
					current_user = await sync_to_async(MyUser.objects.get)(id=self.player_id)

					await sync_to_async(tournament.add_winner)(current_user)
					await self._create_auto_win_record(current_user)
					await self.send_game_finish(self.player_id)
		except Exception as e:
			print(f'Error in autowin: {e}')

	async def _create_auto_win_record(self, winner):	
		try:
			await sync_to_async(MatchHistory.objects.create)(
				user=winner,
				opponent_name="Tournament Opponents",
				type='Tournament',
				won=True
			)
			winner.wins += 1
			winner.tickets += 1
			await sync_to_async(winner.save)()
		except Exception as e:
			print(f"Error creating win record: {e}")

	async def handle_player_search(self, data):
		player_info = {
				'id': self.player_id,
				'username': data['player_name'],
				'avatar': data['player_avatar'],
		}
		self.username = data['player_name']

		self.game, self.game_id = await pong_server.initialize_game(False, player_info)
		if self.game:
			await self.start_game_db()
			await self._setup_game()
		else:
			await self.waiting_game_db()
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
		begin = time.time()
		try:
			while True:
				if self.game and self.game.status == 'WAITING':
					now = time.time()
					if now - begin >= 30:
						await self.game_not_launch()
				if not self.game:
					break
				if await self._wait_for_event(self.game.events['game_cancelled']):
					break

				if await self._wait_for_event(self.game.events['game_finished']):
					break
				
				await asyncio.sleep(0.1)
		except Exception as e:
			print(f"Error in game events watcher: {e}")
		finally:
			if self.game and self.game.events['game_cancelled'].is_set():
				await pong_server.cleanup_player(self.player_id, self.username, self.game_id, False)
		

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
				await self.start_game_db()

	async def handle_find_game_message(self, event):
		await self.handle_find_game({
			'game_id': event['game_id']
		})

	async def game_not_launch(self):
		if not self.game or self.game.events['game_cancelled'].is_set() or self.game.events['game_finished'].is_set():
			return
		id = 0
		username = None
		
		if not self.game.p1.ready and not self.game.p2.ready:
			id = self.game.p2.id
			username = self.game.p2.username
		elif not self.game.p1.ready:
			id = self.game.p1.id
			username = self.game.p1.username
		elif not self.game.p2.ready:
			id = self.game.p2.id
			username = self.game.p2.username
		
		if self.game_id not in pong_server._game_locks:
			pong_server._game_locks[self.game_id] = asyncio.Lock()
			async with pong_server._game_locks[self.game_id]:
				if not await pong_server.game_is_stocked(self.game_id) and self.game.p1 and self.game.p2:
					winner_user, loser_user = await self.get_players_users(False, True)
					if await self.update_stats_and_create_matches(winner_user, loser_user, True):
						await pong_server.stock_game(self.game_id)
		await pong_server.cleanup_player(id, username, self.game_id, False)

	async def handle_player_ready(self, data):
		if not self.game:
			return
		both_r = await self.game.set_player_ready(self.player_id)
		await self.notify_player_ready()
		if both_r:
			await self.start_game_sequence()

	async def start_game_sequence(self):
		await self.notify_game_start(self.game.p1, self.game.p2)
		self.game.status = "LAUNCHING"
		if self.solo_task and not self.solo_task.done():
			self.solo_task.cancel()
			try:
				await self.solo_task
			except asyncio.CancelledError:
				pass
			self.solo_task = None
		if not self._countdown_task:
			self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
		asyncio.create_task(self.launch_game_after_countdown())

	async def launch_game_after_countdown(self):
		await self._countdown_done.wait()
		if not self.send_ball_task and self.game and not self.game.events['game_cancelled'].is_set():
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
					await asyncio.sleep(0.01)
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
			await self.game.move_player(self.player_id, self.moving_direction)
			await asyncio.sleep(0.0166)

	async def _redis_listener(self):
		try:
			async for message in self.pubsub.listen():
				if self.game.events['game_cancelled'].is_set():
					break
				if message['type'] == 'message':
					await self.handle_redis_message(message['data'])
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
		try:
			if self.solo_task and not self.solo_task.done():
				self.solo_task.cancel()
				try:
					await self.solo_task
				except asyncio.CancelledError:
					pass
		except Exception as e:
			print(f'Error cancelling solo_task: {e}')
		if self.game_id not in pong_server._game_locks:
			pong_server._game_locks[self.game_id] = asyncio.Lock()
			async with pong_server._game_locks[self.game_id]:
				if await pong_server.game_is_stocked(self.game_id):
					return
				winning_session = data.decode().split('_')[-1]
				winner_user, loser_user = await self.get_players_users()
				await self.update_stats_and_create_matches(winner_user, loser_user, False)

				await pong_server.stock_game(self.game_id)
				
				await pong_server.cleanup_player(self.game.p1.id, self.game.p1.username, self.game_id, True)
				await pong_server.cleanup_player(self.game.p2.id, self.game.p2.username, self.game_id, True)
				self.game.status = 'FINISHED'
				await self.notify_game_finish(winning_session)
				await self.cleanup()

	@database_sync_to_async
	def get_players_users(self, p_is_quitting = False, p_not_ready = False):
		if p_is_quitting:
			if self.player_id == self.game.p1.id:
				winner = self.game.p2
				loser = self.game.p1
			elif self.player_id == self.game.p2.id:
				winner = self.game.p1
				loser = self.game.p2
		elif p_not_ready:
			if not self.game.p1.ready and not self.game.p2.ready:
				winner = self.game.p1
				loser = self.game.p2
			elif not self.game.p1.ready:
				winner = self.game.p2
				loser = self.game.p1
			elif not self.game.p2.ready:
				winner = self.game.p1
				loser = self.game.p2
		else:
			winner = self.game.winner
			loser = self.game.p1 if winner == self.game.p2 else self.game.p2
		return (winner.user_model, loser.user_model)

	@database_sync_to_async
	def update_stats_and_create_matches(self, winner, loser, p_is_quitting):
		current_player = self.game.p1 if self.game.p1.id == self.player_id else self.game.p2
		current_user_is_winner = (current_player.user_model == winner)
		winner.wins += 1
		loser.looses += 1
	
		MatchHistory.objects.create(
			user=winner,
			opponent_name=loser.username,
			type='Tournament' if self.in_tournament else 'Pong',
			won=True
		)
		MatchHistory.objects.create(
			user=loser,
			opponent_name=winner.username,
			type='Tournament' if self.in_tournament else 'Pong',
			won=False
		)
		winner.tickets += 1
		winner.save()
		loser.save()
	
		if self.in_tournament and self.tournament_code:
			try:
				tournament = Tournament.objects.get(code=self.tournament_code)
				if self.is_final_match:
					tournament.set_winner_for_a_match(winner.id)
					tournament.started = False
				else:
					tournament.set_winner_for_a_match(winner.id)
					tournament.add_finalist(winner)
	
					if tournament.finalist.count() == 2:
						finalists = list(tournament.finalist.all())
						tournament.create_final(finalists[0], finalists[1])
	
				tournament.save()
			except Tournament.DoesNotExist:
				print(f"Tournament {self.tournament_code} not found")
	
		return True

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
		opp = None
		if data.get('opponent'):
			opp = data.get('opponent')
		message = {
			'type': 'waiting_tournament',
			'player_id': data['player_id'],
			'player_name': data['player_name'],
			'player_avatar': data['player_avatar'],
			'create': data['create'],
			'opponent': opp,
			'tournament_code': data['tournament_code']
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

	async def notify_countdown(self, countdown):
		message = {
			'type': 'countdown',
			'countdown': countdown,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_score_update(self, scores, p_id):
		message = {
			'type': 'score_update',
			'scores': scores,
			'player_id': p_id,
		}
		await self.send(text_data=json.dumps(message))

	async def notify_player_move(self, player):
		message = {
			'type': 'player_move',
			'y': player['y'],
			'player_id': player['id']
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_no_opp(self):
		message = {
			'type': 'no_opp',
			'player_id': self.player_id,
		}
		await self.send(text_data=json.dumps(message))

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

	async def send_game_finish(self, winning_session):
		message = {
			'type': 'game_finish',
			'winning_session': winning_session,
			'message': 'auto_win'
		}
		await self.send(text_data=json.dumps(message))

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
			'game_status': event['game_status'],
			'id': event['id']
		}
		await self.send(text_data=json.dumps(message))

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

	async def notify_game_finish(self, winning_session):
		message = {
			'type': 'game_finish',
			'winning_session': winning_session,
			'message': 'game_is_over'
		}
		await self.channel_layer.group_send(self.game.group_name, message)

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