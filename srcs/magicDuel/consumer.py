from asgiref.sync import sync_to_async
from asgiref.timeout import timeout
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from .player import Player
from .game import Game

import asyncio
import json
import time
import uuid

class MagicDuelConsumer(AsyncWebsocketConsumer):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self._countdown_task = None
		self._game_loop_task = None
		self._start_round_task = None
		self._round_complete_event = asyncio.Event()
		self._countdown_done = asyncio.Event()
		self._both_anim_done = asyncio.Event()
		self.current_round_count = 0
		self.game = None
		self.game_id = None
		self.cleanup_lock = asyncio.Lock()
		self.is_cleaning_up = False 
		self.game_cancel_event = asyncio.Event()
		self.round_time = 5
		self.p1_as_attack = asyncio.Event()
		self.p2_as_attack = asyncio.Event()
		self.monitor_task = None
		self.round_task = None

	async def connect(self):
		self.player_id = int(self.scope['url_route']['kwargs']['player_id'])
		previous_channel = cache.get(f"player_{self.player_id}_channel")
		if previous_channel:
			await self.channel_layer.group_discard("wizard_duel_players", previous_channel)
		
		cache.set(f"player_{self.player_id}_channel", self.channel_name)

		await self.channel_layer.group_add("wizard_duel_players", self.channel_name)
		await self.accept()
		
	async def disconnect(self, close_code):
		try:
			if self.monitor_task is not None and self.round_task is not None and not await self.game.is_stocked():
				loser = self.game.p1 if self.game.p1.id == self.player_id else self.game.p2
				winner = self.game.p1 if self.player_id == self.game.p2.id else self.game.p2
				winner_user, loser_user = await self.get_players_users(winner, loser)
				if await self.update_magic_stats_and_history(winner_user, loser_user, True):
					await self.game.set_stocked()

			await asyncio.wait_for(self._handle_disconnect(close_code), timeout=5)
		except asyncio.TimeoutError:
			print("Disconnect operation timed out")
		except Exception as e:
			print(f"Error during disconnect: {e}")

	async def _handle_disconnect(self, close_code):
		print(f"Disconnect player {self.player_id} from game {self.game_id}")
		
		key = 'waiting_wizard_duel_players'
		current_waiting_players = await sync_to_async(cache.get)(key) or []
		current_waiting_players = [p for p in current_waiting_players if p['id'] != self.player_id]
		await sync_to_async(cache.set)(key, current_waiting_players)
		if self.game_id:
			await sync_to_async(cache.delete)(f"player_{self.player_id}_channel")

			if self.game:
				username_gone = self.game.p1.username if self.player_id == self.game.p1.id else self.game.p2.username
				await self.notify_game_cancel(username_gone)
				
				if self.game.status == "WAITING":
					await sync_to_async(cache.delete)(f'wizard_duel_game_{self.game_id}')
				else:
					await self.game.handle_player_disconnect(self.player_id)

			await self.cleanup()

	async def cleanup(self):
		async with self.cleanup_lock:
			print('cleanup')
			if self.is_cleaning_up:
				return
			self.is_cleaning_up = True
			
			try:

				self.game_cancel_event.set()
				self._round_complete_event.set()
				self._both_anim_done.set()
				self._countdown_done.set()

				tasks = [
					task for task in [
					self._countdown_task,
					self._game_loop_task,
					self.monitor_task,
					self.round_task,
					self._start_round_task,
					getattr(self, 'time_task', None),
					getattr(self, 'action_task', None)
					]if task
				]

				for task in tasks:
					if task and not task.done():
						task.cancel()

				if tasks:
					await asyncio.wait([task for task in tasks if task], timeout=5)

				if self.game and hasattr(self.game, 'group_name'):
					await self.channel_layer.group_discard(self.game.group_name, self.channel_name)

				cache_keys = [
					f'wizard_duel_player_{self.player_id}',
					f'wizard_duel_game_{self.game_id}',
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

		
	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data['action']

		actions = {
			'ready': self.handle_player_ready,
			'attack': self.handle_player_attack,
			'finishAnim': self.handle_finish_anim,
			'search': self.handle_player_search,
			'findGame': self.handle_find_game,
			'cancel': self.handle_game_cancel,
		}

		handler = actions.get(action)
		if handler:
			await handler(data)

	async def handle_game_cancel(self, data):
		self.game_cancel_event.set()

	async def handle_player_search(self, data):
		key = 'waiting_wizard_duel_players'

		current_waiting_players = cache.get(key) or []

		player_info = {
			'id':  self.player_id,
			'username': data['player_name'],
			'avatar': data['player_avatar'],
			'ligue_points': data['player_lp'],
			'timestamp': time.time()
		}
		
		if not any(player['id'] == self.player_id for player in current_waiting_players):
			current_waiting_players.append(player_info)
			await sync_to_async(cache.set)(key, current_waiting_players)

		opponent_info  = await self.find_opponent(data['player_lp'])
		if opponent_info:
			self.game_id = str(uuid.uuid4())

			self.game = Game(player_info, opponent_info, self.game_id)
			await self.game.save_to_cache()

			await self.channel_layer.group_add(self.game.group_name, self.channel_name)
			opponent_channel_name = cache.get(f"player_{opponent_info['id']}_channel")
			if opponent_channel_name:
				await self.channel_layer.group_add(self.game.group_name, opponent_channel_name)
			
			await self.send_players_info(self.game.to_dict())
			key = 'waiting_wizard_duel_players'
			current_waiting_players = await sync_to_async(cache.get)(key) or []
			current_waiting_players = [p for p in current_waiting_players if p['id'] != self.player_id]
			await sync_to_async(cache.set)(key, current_waiting_players)
			asyncio.create_task(self._player_not_lock_in_game_tournament())
		else:
			pass

	async def _player_not_lock_in_game_tournament(self):
		begin = time.time()
		try:
			while True:
				current_game = await Game.get_game_from_cache(self.game_id)
				if not current_game or current_game.status != 'WAITING':
					break
				
				now = time.time()
				if now - begin >= 30:
					self.stop_waiting = True
					
					if current_game and hasattr(current_game, 'p1') and hasattr(current_game, 'p2'):
						p1_ready = current_game.p1.ready if hasattr(current_game.p1, 'ready') else False
						p2_ready = current_game.p2.ready if hasattr(current_game.p2, 'ready') else False
						
						winner = None
						loser = None
						
						if p1_ready and not p2_ready:
							winner = current_game.p1
							loser = current_game.p2
						elif p2_ready and not p1_ready:
							winner = current_game.p2
							loser = current_game.p1
						
						if winner and loser and not await current_game.is_stocked():
							winner_user, loser_user = await self.get_players_users(winner, loser)
							await self.update_magic_stats_and_history(winner_user, loser_user, True)
							await current_game.set_stocked()
						
						message = {
							'type': 'game_cancel',
							'message': 'Game cancelled due to timeout',
							'username': 'System',
							'game_status': 'CANCELLED',
							'lose_lp': winner is not None
						}
						await self.channel_layer.group_send(current_game.group_name, message)
					break
				
				await asyncio.sleep(0.1)
		except asyncio.CancelledError:
			return


	async def find_opponent(self, player_points):
		key = 'waiting_wizard_duel_players'

		current_waiting_players = cache.get(key) or []

		potiential_opponents = [
			player for player in current_waiting_players
			if player['id'] != self.player_id
		]

		if not potiential_opponents:
			return None

		current_time = time.time()

		def get_range_points(time):
			if time < 10:
				return 100
			elif time < 30:
				return 200
			elif time < 50:
				return 300
			return float('inf')

		potiential_opponents.sort(
			key=lambda x: abs(x['ligue_points'] - player_points)
		)

		for opponent in potiential_opponents:
			wait_time = current_time - opponent['timestamp']
			range = get_range_points(wait_time)
			if abs(opponent['ligue_points'] - player_points) <= range:
				current_waiting_players.remove(opponent)
				await sync_to_async(cache.set)(key, current_waiting_players)
				return opponent
			
		return None
		
	async def handle_find_game(self, data):
		if self.game is None:
			self.game_id = data['game_id']
			self.game = await Game.get_game_from_cache(self.game_id)

	async def handle_finish_anim(self, data):
		player_id = data['player_id']
		round = data['round']
		game_key = f"game_{self.game_id}_round_{round}_finished"
		ready_state = cache.get(game_key, {})
		if player_id in ready_state:
			ready_state[player_id] = True
			cache.set(game_key, ready_state)
		
		if all(ready_state.values()):
			self._both_anim_done.set()

	async def handle_player_attack(self, data):
		if data['player_id'] == self.game.p1.id:
			self.p1_as_attack.set()
			await self.game.p1.assign_action(data['choice'])
		elif data['player_id'] == self.game.p2.id:
			self.p2_as_attack.set()
			await self.game.p2.assign_action(data['choice'])
		await self.notify_player_attack(data['player_id'])

	async def handle_player_ready(self, data):
		await self.game.set_a_player_ready(self.player_id)
		await self.notify_player_ready()
		await self.check_both_ready()

	async def check_both_ready(self):
		async with asyncio.Lock():
			if self.game.both_players_ready():
				await self.start_game_sequence()

	async def start_game_sequence(self):
		self.game.status = 'IN_PROGRESS'
		await self.game.save_to_cache()

		await self.notify_game_start(self.game.p1, self.game.p2)
		if not self._countdown_task:
			self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
		asyncio.create_task(self._launch_game_after_countdown())


	async def _launch_game_after_countdown(self):
		await self._countdown_done.wait()	
		if not self._game_loop_task:
			self._game_loop_task = asyncio.create_task(self.game_loop())

	async def run_countdown_sequence(self):
		for count in range(3, -1, -1):
			await self.notify_countdown(count)
			if count > 0:
				await asyncio.sleep(1)
			elif count == 0:
				await asyncio.sleep(1)
		self._countdown_done.set()

	async def game_loop(self):
		try:
			await self.game.update_players()
			if self.game_cancel_event.is_set():
				return		
			game_over_event = asyncio.Event()

			self.monitor_task  = asyncio.create_task(self.monitor_game_state(game_over_event))
			self.round_task = asyncio.create_task(self.round_manager(game_over_event))

			asyncio.gather(
				self.monitor_task,
				self.round_task,
				return_exceptions=True
			)
		except Exception as e:
			print(f"Error in game_loop {e}")
		finally:
			if self.game_cancel_event.is_set():
				await self.cleanup()

	@database_sync_to_async
	def update_magic_stats_and_history(self, winner, loser, p_is_quitting):
		from api.models import MatchHistory
		current_player = self.game.p1 if self.game.p1.id == self.player_id else self.game.p2
		current_user_is_winner = (current_player.id == winner.id)

		if not current_user_is_winner and not p_is_quitting:
			return False
		print('pass return ')
		winner.wins += 1
		winner.ligue_points += 15
		loser.looses += 1
		loser.ligue_points -= 15
	
		MatchHistory.objects.create(
			user=winner,
			opponent_name=loser.username,
			type='MagicDuel',
			won=True
		)
		MatchHistory.objects.create(
			user=loser,
			opponent_name=winner.username,
			type='MagicDuel',
			won=False
		)
	
		
		winner.save()
		loser.save()
		return True

	@database_sync_to_async
	def get_players_users(self, winner, loser):
		from api.models import MyUser  
		winner_user = MyUser.objects.get(id=winner.id)
		loser_user = MyUser.objects.get(id=loser.id)
		return (winner_user, loser_user)

	async def monitor_game_state(self, game_over_event):
		try:
			while not game_over_event.is_set() and not self.game_cancel_event.is_set():
				await self.game.update_game()
				if self.game.status == 'CANCELLED':
					await self.cleanup()
					return
				if self.game.p1 is None or self.game.p2 is None:
					game_over_event.set()
					break
				if self.game.p1.life <= 0 or self.game.p2.life <= 0:
					self.game.status = 'FINISHED'
					await self.game.save_to_cache()
					game_over_event.set()
					
					winner = self.game.p2 if self.game.p1.life <= 0 else self.game.p1
					loser = self.game.p1 if self.game.p1.life <= 0 else self.game.p2
					
					winner_user, loser_user = await self.get_players_users(winner, loser)
					if await self.update_magic_stats_and_history(winner_user, loser_user, False):
						await self.game.set_stocked()
					await self.notify_game_end()
					break
				await asyncio.sleep(0.5)
		except asyncio.CancelledError:
			game_over_event.set()
			await self.cleanup()
		except Exception as e:
			print(f"Error in monitor_game_state: {e}")
			game_over_event.set()

	async def round_manager(self, game_over_event):
		try: 
			while not game_over_event.is_set() and not self.game_cancel_event.is_set():
				try:
					if self.game.status == 'CANCELLED' or self.game_cancel_event.is_set():
						break

					await asyncio.wait_for(
						self.execute_round(),
						timeout=self.round_time + 10
					)
					await asyncio.sleep(0.5)
				except asyncio.TimeoutError:
					print('Round timeout - start new round')
					await self.cleanup_round()
				except asyncio.CancelledError:
					print('Round cancel')
					raise
				except Exception as e:
					print(f"Error in round : {e}")
					self.game_cancel_event.set()
					await self.cleanup_round()
					break
		except asyncio.CancelledError:
			raise
		except Exception as e:
			print(f"Error in round_manager: {e}")
		finally:
			self.game_cancel_event.set()
			await self.cleanup_round()

	async def execute_round(self):
		self.current_round_count += 1
		await self.notify_round_count(self.current_round_count)
		await asyncio.sleep(3)
		try:
			if self.game_cancel_event.is_set():
				return
			self.time_task = asyncio.create_task(self.manage_round_time())
			self.action_task = asyncio.create_task(self.manage_players_actions())

			asyncio.gather(
				self.time_task,
				self.action_task,
				return_exceptions=True
			)
			await asyncio.wait_for(self._round_complete_event.wait(), timeout=self.round_time + 5)
			await self.notify_round_end()
			await self.game.update_game()
			result = await self.check_winner_round()
			await asyncio.sleep(1)
			if result is not None and not self.game_cancel_event.is_set():
				winner_id, power = await self.apply_power(result)
				await self.notify_round_interaction(winner_id, power, self.game.p1.life, self.game.p2.life)
				try:
					await asyncio.wait_for(self._both_anim_done.wait(), timeout=15) 
				except asyncio.TimeoutError:
					self._both_anim_done.set()
				finally:
					await self.cleanup_round()
					await asyncio.sleep(1)
					await self.game.save_to_cache()
		except asyncio.TimeoutError:
				self._round_complete_event.set()

	async def cleanup_round(self):
		if self.game is None or self.game.p1 is None or self.game.p2 is None:
			self.cleanup()
			return
		await self.game.p1.assign_action(None)
		await self.game.p2.assign_action(None)
		self._round_complete_event.clear()
		self._both_anim_done.clear()
		self._start_round_task = None
		self.time_task = None
		self.action_task = None
		await self.game.update_game()

	async def  manage_round_time(self):
		start_time = time.time()
		await self.notify_round_timer(start_time)
		remaining_time = 0
		while not self._round_complete_event.is_set() \
			and not self.game_cancel_event.is_set() \
			and not self.game.status == 'CANCELLED':
			elapsed_time = time.time() - start_time
			remaining_time =  max(self.round_time - elapsed_time, 0)
			if remaining_time <= 0:
				self._round_complete_event.set()
				break

			await asyncio.sleep(0.1)

	async def manage_players_actions(self):
		while not self._round_complete_event.is_set() \
			and not self.game_cancel_event.is_set() \
			and not self.game.status == 'CANCELLED':
			await self.game.update_game()
			if self.game.p1 and self.game.p2 and self.game.p1.action and self.game.p2.action:
				self._round_complete_event.set()
				break

			await asyncio.sleep(0.5)

	async def check_winner_round(self):
		if self.game_cancel_event.is_set() or self.game.status == 'CANCELLED':
			return
		ret = await self.game.check_players_have_played()
		if ret != None:
			self.game.status = 'CANCELLED'
			await self.notify_player_no_play(ret)
			await self.cleanup_round()
			await self.cleanup()
			return

		result = self.resolve_power(self.game.p1.action, self.game.p2.action)
		if result == 'Error interaction':
			return None
			
		return result

	@staticmethod
	def resolve_power(a_p1, a_p2):
		power_interaction_table = {
			('dark_bolt', 'spark'): 1,
			('dark_bolt', 'fire_bomb'): 2,
			('dark_bolt', 'lightning'): 0,
			('dark_bolt', 'dark_bolt'): 0,
			('dark_bolt', None): 1,
			(None, 'dark_bolt'): 2,
			('fire_bomb', 'dark_bolt'): 1,
			('fire_bomb', 'lightning'): 2,
			('fire_bomb', 'spark'): 0,
			('fire_bomb', 'fire_bomb'): 0,
			('fire_bomb', None): 1,
			(None, 'fire_bomb'): 2,
			('lightning', 'fire_bomb'): 1,
			('lightning', 'spark'): 2,
			('lightning', 'dark_bolt'): 0,
			('lightning', 'lightning'): 0,
			('lightning', None): 1,
			(None, 'lightning'): 2,
			('spark', 'lightning'): 1,
			('spark', 'dark_bolt'): 2,
			('spark', 'fire_bomb'): 0,
			('spark', 'spark'): 0,
			('spark', None): 1,
			(None, 'spark'): 2,
			(None, None): 0
		}

		return power_interaction_table.get((a_p1, a_p2), "Error interaction")

	async def apply_power(self, result):
		id_winner = 0
		action = None

		if result == 1:
			await self.game.p2.lose_life()
			id_winner = self.game.p1.id
			action = self.game.p1.action
		elif result == 2:
			await self.game.p1.lose_life()
			id_winner = self.game.p2.id
			action = self.game.p2.action

		return id_winner, action


	async def notify_game_cancel(self, username_gone):
		lose_lp = True if self.monitor_task is not None else False
		print('lose lp', lose_lp)
		await self.game.update_status_game()
		if not self.game.status == 'FINISHED':
			self.game_cancel_event.set()
			message = {
				'type': 'game_cancel',
				'message': f'Player {username_gone} is gone, game is cancelled',
				'username': username_gone,
				'game_status': self.game.status,
				'lose_lp': lose_lp
			}
			await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_player_no_play(self, data):
		self.game.update_status_game()
		if not self.game.status == 'FINISHED':
			self.game_cancel_event.set()
			message = {
				'type': 'no_play',
				'p_id': data['p_id'],
				'p2_id': data['p2_id'],
				'p_name': data['p_name'],
				'p2_name': data['p2_name'],
				'game_status': self.game.status,
			}
			await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_round_timer(self, start_time):
		message = {
			'type': 'round_timer',
			'start_time': start_time,
			'total_time': self.round_time
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_player_attack(self, player_id):
		message = {
			'type': 'player_attack',
			'player_id': player_id,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_game_end(self):
		id_winner = self.game.p1.id if self.game.p2.life == 0 else self.game.p2.id
		message = {
			'type': 'game_end',
			'player_id': id_winner
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_round_interaction(self, p_id, power, p1_life, p2_life):
		message = {
			'type': 'round_interaction',
			'player_id': p_id,
			'power': power,
			'p1_life': p1_life,
			'p2_life': p2_life,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_round_end(self):
		message = {
			'type': 'round_end',
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_round_count(self, count):
		message = {
			'type': 'round_count',
			'count': count,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_countdown(self, countdown):
		message = {
			'type': 'countdown',
			'countdown': countdown,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_player_connected(self):
		is_player_1 = self.game.p1.id == self.player_id
		username = self.game.p1_username if is_player_1 else self.game.p2_username
		avatar = self.game.p1_avatar if is_player_1 else self.game.p2_avatar
		message = {
			'type': 'player_connected',
			'player_id': self.player_id,
			'username': username,
			'avatar': avatar,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_game_start(self, player1, player2):
		message = {
			'type': 'game_start',
			'player1_id': player1.id,
			'player2_id': player2.id,
			'player1_name': player1.username,
			'player2_name': player2.username,
			'player1_avatar': player1.avatar,
			'player2_avatar': player2.avatar,
			'player1_life': player1.life,
			'player2_life': player2.life,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

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

	async def send_players_info(self, game):
		message = {
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

	async def no_play(self, event):
		message = {
			'type': 'no_play',
			'p_id': event['p_id'],
			'p2_id': event['p2_id'],
			'p_name': event['p_name'],
			'p2_name': event['p2_name'],
			'game_status': event['game_status'],
		}
		await self.send(text_data=json.dumps(message))

	async def game_cancel(self, event):
		message = {
			'type': 'game_cancel',
			'username': event['username'],
			'game_status': event['game_status'],
			'message': event['message'],
			'lose_lp': event['lose_lp']
		}
		await self.send(text_data=json.dumps(message))

	async def debug(self, event):
		message = {
			'type': 'debug',
			'from': event['from']
		}
		await self.send(text_data=json.dumps(message))

	async def round_timer(self, event):
		message = {
			'type': 'round_timer',
			'start_time': event['start_time'],
			'total_time': event['total_time'],
		}
		await self.send(text_data=json.dumps(message))

	async def player_attack(self, event):
		message = {
			'type': 'player_attack',
			'player_id': event['player_id'],
		}
		await self.send(text_data=json.dumps(message))

	async def round_end(self, event):
		message = {
			'type': event['type']
		}
		await self.send(text_data=json.dumps(message))

	async def game_end(self, event):
		message = {
			'type': 'game_end',
			'player_id': event['player_id'],
		}
		await self.send(text_data=json.dumps(message))

	async def round_interaction(self, event):
		message = {
			'type': 'round_interaction',
			'player_id': event['player_id'],
			'power': event['power'],
			'p1_life': event['p1_life'],
			'p2_life': event['p2_life'],
		}
		await self.send(text_data=json.dumps(message))

	async def round_count(self, event):
		message = {
			'type': 'round_count',
			'count': event['count'],
		}
		await self.send(text_data=json.dumps(message))

	async def countdown(self, event):
		message = {
			'type': 'countdown',
			'countdown': event['countdown'],
		}
		await self.send(text_data=json.dumps(message))

	async def game_start(self, event):
		message = {
			'type': 'game_start',
			'player1_id': event['player1_id'],
			'player2_id': event['player2_id'],
			'player1_name': event['player1_name'],
			'player2_name': event['player2_name'],
			'player1_avatar': event['player1_avatar'],
			'player2_avatar': event['player2_avatar'],
			'player1_lifes': event['player1_life'],
			'player2_lifes': event['player2_life'],
		}
		await self.send(text_data=json.dumps(message))

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

	async def player_connected(self, event):
		message = {
			'type': 'player_connected',
			'player_id': event['player_id'],
			'username': event['username'],
			'avatar': event['avatar'],
		}
		await self.send(text_data=json.dumps(message))

	async def player_ready(self, event):
		message = {
			'type': 'player_ready',
			'player_number': event['player_number'],
		}
		await self.send(text_data=json.dumps(message))

	async def game_message(self, event):
		message = {
			'type': 'game_message',
			'message': event['message'],
		}
		await self.send(text_data=json.dumps(message))