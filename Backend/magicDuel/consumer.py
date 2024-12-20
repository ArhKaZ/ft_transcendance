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
		self._game_lock = asyncio.Lock()
		self._ready_lock = asyncio.Lock()
		self._broadcast_lock = asyncio.Lock()
		self._countdown_task = None
		self._game_loop_task = None
		self._start_round_task = None
		self._round_complete_event = asyncio.Event()
		self._countdown_done = asyncio.Event()
		self._both_anim_done = asyncio.Event()
		self._game_state = {}
		self.anim_state = {}
		self.current_round_count = 0
		self.game = None
		self.game_id = None
		self.cleanup_lock = asyncio.Lock()
		self.is_cleaning_up = False 

	async def connect(self):
		self.player_id = self.scope['url_route']['kwargs']['player_id']	

		previous_channel = cache.get(f"player_{self.player_id}_channel")
		if previous_channel:
			await self.channel_layer.group_discard("wizard_duel_players", previous_channel)
		
		cache.set(f"player_{self.player_id}_channel", self.channel_name)

		await self.channel_layer.group_add("wizard_duel_players", self.channel_name)
		await self.accept()
		

	async def disconnect(self, close_code):
		if self.game_id:
			print(f"Disconnect player {self.player_id} from game {self.game_id}")
			await sync_to_async(cache.delete)(f"player_current_game_{self.player_id}")
			await self.notify_game_cancel(self.player_id)
			await self.cleanup(False)

	async def cleanup(self, game_finished):
		async with self.cleanup_lock:
			if self.is_cleaning_up:
				return
			self.is_cleaning_up = True
			
			try:
				if self._countdown_task and not self._countdown_task.done():
					self._countdown_task.cancel()
					try:
						await self._countdown_task
					except asyncio.CancelledError:
						pass

				if self._game_loop_task and not self._game_loop_task.done():
					self._game_loop_task.cancel()
					try:
						await self._game_loop_task
					except asyncio.CancelledError:
						pass

				if self._start_round_task and not self._start_round_task.done():
					self._start_round_task.cancel()
					try:
						await self._start_round_task
					except asyncio.CancelledError:
						pass

				if  self.game and hasattr(self.game, 'group_name'):
					await self.channel_layer.group_discard(self.game.group_name, self.channel_name)

				print(f"Game {self.game_id} removed from cache")
				await self.remove_game_from_cache(game_finished)
			except Exception as e:
				print(f"Error during cleanup: {e}")
			finally:
				self.is_cleaning_up = False

		
	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data['action']

		actions = {
			'ready': self.handle_player_ready,
			'attack': self.handle_player_attack,
			'finishAnim': self.handle_finish_anim,
			'search': self.handle_player_search,
			'findGame': self.handle_find_game,
		}

		handler = actions.get(action)
		if handler:
			await handler(data)


	async def handle_player_search(self, data):
		print('hello!')
		player_game_key = f"player_current_game_{self.player_id}"
		current_game = await sync_to_async(cache.get)(player_game_key)

		if current_game:
			await self.send(text_data=json.dumps({
				'type': 'error',
				'message': 'Already in a game'
			}))
			return
		print('je passe ici ')
		key = 'waiting_wizard_duel_players'

		current_waiting_players = cache.get(key) or []

		player_info = {
			'id':  self.player_id,
			'username': data['player_name'],
			'avatar': data['player_avatar'],
		}

		print(current_waiting_players)
		if not any(player['id'] == self.player_id for player in current_waiting_players):
			print("player info:", player_info)
			current_waiting_players.append(player_info)
			await sync_to_async(cache.set)(key, current_waiting_players)

		opponent_info  = await self.find_opponent()
		if opponent_info:
			print(opponent_info)
			self.game_id = str(uuid.uuid4())
			await sync_to_async(cache.set)(f"player_current_game_{self.player_id}", self.game_id, timeout=3600)
			await sync_to_async(cache.set)(f"player_current_game_{opponent_info['id']}", self.game_id, timeout=3600)

			self.game = Game(player_info, opponent_info, self.game_id)
			await self.game.save_to_cache()

			await self.channel_layer.group_add(self.game.group_name, self.channel_name)
			opponent_channel_name = cache.get(f"player_{opponent_info['id']}_channel")
			if opponent_channel_name:
				await self.channel_layer.group_add(self.game.group_name, opponent_channel_name)
			
			await self.send_players_info(self.game.to_dict())
		else:
			pass
			# await self.waiting_for_opponent()

	async def find_opponent(self):
		key = 'waiting_wizard_duel_players'

		current_waiting_players = cache.get(key) or []

		current_waiting_players = list(
			filter(lambda player: player['id'] != self.player_id, current_waiting_players)
		)

		if current_waiting_players:
			opponent_info = current_waiting_players.pop(0)
			await sync_to_async(cache.set)(key, current_waiting_players)

			return opponent_info
		else:
			return None
		
	async def handle_find_game(self, data):
		if self.game is None:
			print(data)
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
		player = await Player.create_player_from_cache(data['player_id'], self.game_id)
		if not player:
			return
		player.action = data['choice']
		await player.save_to_cache()
		await self.notify_player_attack(data['player_id'])

	async def handle_player_ready(self, data):
		await self.async_set_player_ready()
		await self.notify_player_ready()
		await self.check_both_ready()

	async def check_both_ready(self):
		async with asyncio.Lock():
			if self.game.both_players_ready():
				await self.start_game_sequence()

	async def async_set_player_ready(self):
		player = await self.set_player_ready()
		if player:
			await player.save_to_cache()
	
	async def set_player_ready(self):
		nb = await self.game.set_a_player_ready(self.player_id)
		return Player(nb, self.player_id, self.game_id)

	async def  start_game_sequence(self):
		self.game.status = 'IN_PROGRESS'
		await self.game.save_to_cache()

		player1, player2 = await self.create_players()

		self._game_state[self.game_id] = {
			'players': (player1, player2),
			'round': 0,
			'game_active': True
		}

		await self.notify_game_start(self.game.to_dict(), player1, player2)
		if not self._countdown_task:
			self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
		#Create task to wait countdown end
		asyncio.create_task(self._launch_game_after_countdown())

	async def create_players(self):
		player1 = await Player.create_player_from_cache(self.game.p1_id, self.game_id)
		player2 = await Player.create_player_from_cache(self.game.p2_id, self.game_id)
		# await player1.save_to_cache()
		# await player2.save_to_cache()
		return player1, player2

	async def _launch_game_after_countdown(self):
		await self._countdown_done.wait()
		# game_loop_task can be launch because countdown is done
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
		players = await Player.get_players_of_game(self.game_id)
		if players is None:
			print("Error getting players of the game in game_loop")
			return

		# Use an event to manage game state
		game_over_event = asyncio.Event()

		async def monitor_game_state():
			nonlocal players
			while not game_over_event.is_set():
				if players[0].life <= 0 or players[1].life <= 0:
					game_over_event.set()
					break
				players = await Player.get_players_of_game(self.game_id)
				await asyncio.sleep(0.5) # Short sleep to prevent tight loop

		async def round_manager():
			while not game_over_event.is_set():
				if not self._start_round_task:
					self._start_round_task = asyncio.create_task(self.start_round(players))

				# Wait for the next round or game end
				try:
					await asyncio.wait_for(game_over_event.wait(), timeout=10.0)
				except asyncio.TimeoutError:
					continue

			# Game ended
			await self.notify_looser(players)

		# Run game monitoring and round management concurrently
		await asyncio.gather(
			monitor_game_state(),
			round_manager()
		)

	async def start_round(self, players):
		self.current_round_count += 1
		print(self.current_round_count)
		await self.notify_round_count(self.current_round_count)

		await asyncio.sleep(3)
		# Create an event to signal round completion
		# self_round_complete_event = asyncio.Event()
		async def wait_for_player_actions():
			# Implement a timeout mechanism for player actions
			try:
				await asyncio.wait_for(
					self.wait_for_both_players_action(players), #N'arrete pas le timer
					timeout=20.0
				)
				self._round_complete_event.set()
			except asyncio.TimeoutError:
				# Handle timeout (e.g., default to 'none' action)
				self._round_complete_event.set()

		# Run action waiting concurrently
		await asyncio.gather(
			wait_for_player_actions(),
			self.send_round_timer()  # Method to send timer updates to frontend
		)

		# Check and resolve round
		await self.notify_round_end()
		result, players = await self.check_winner_round()

		if result is not None:
			winner_id, power = await self.apply_power(players[0], players[1], result)
			await self.notify_round_interaction(winner_id, power)
			try:
				await asyncio.wait_for(self._both_anim_done.wait(), timeout=20.0)
			except asyncio.TimeoutError:
				print("Animation completed timeout error")
				self._both_anim_done.set()
			finally:
				await Player.reset_action(self.game_id)
				self._round_complete_event.clear()
				self._both_anim_done.clear()
				self._start_round_task = None
				await asyncio.sleep(0.5)


	async def send_round_timer(self, total_time=20):
		start_time = time.time()
		await self.notify_round_timer(start_time)

		while not self._round_complete_event.is_set():
			elapsed_time = time.time() - start_time
			remaining_time =  max(total_time - elapsed_time, 0)

			if remaining_time <= 0:
				break

			await asyncio.sleep(0.1)

	@staticmethod
	async def wait_for_both_players_action(players):
		while not (players[0].action and players[1].action):
			players = await Player.get_players_of_game(players[0].game_id)
			await asyncio.sleep(0.5)

	async def check_winner_round(self):
		players = await Player.get_players_of_game(self.game_id)
		if players is None:
			print("Error getting players of the game in check_winner_round")
			return
		action_p1 = players[0].action
		action_p2 = players[1].action
		result = self.resolve_power(action_p1, action_p2)
		if result == 'Error interaction':
			print('Error with power interaction')
			return None
		return result, players

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

	@staticmethod
	async def apply_power(p1, p2, result):
		id_winner = 0
		action = None

		if result == 1:
			await p2.lose_life()
			id_winner = p1.player_id
			action = p1.action
		elif result == 2:
			await p1.lose_life()
			id_winner = p2.player_id
			action = p2.action

		return id_winner, action

	@database_sync_to_async
	def get_game_from_cache(self, game_id):
		return cache.get(f'wizard_duel_game_{game_id}')

	@database_sync_to_async
	def remove_game_from_cache(self, game_id):
		cache.delete(f'wizard_duel_game_{game_id}')

	async def set_game_to_cache(self, game_id, game):
		cache = caches['default']
		await sync_to_async(cache.set)(f'wizard_duel_game_{game_id}', game, timeout=60*30)

	async def notify_game_cancel(self, p_id):
		message = {
			'type': 'game_cancel',
			'player_id': p_id, # Mettre le pseudo du joueur ?
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_debug(self, fromwhere):
		message = {
			'type': 'debug',
			'from': fromwhere
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_round_timer(self, start_time):
		message = {
			'type': 'round_timer',
			'start_time': start_time,
			'total_time': 20
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_player_attack(self, player_id):
		message = {
			'type': 'player_attack',
			'player_id': player_id,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_looser(self, players):
		id_looser = players[0].player_id if players[1].life == 0 else players[1].player_id
		message = {
			'type': 'looser',
			'player_id': id_looser
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_round_interaction(self, p_id, power):
		message = {
			'type': 'round_interaction',
			'player_id': p_id,
			'power': power
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
		is_player_1 = self.game.p1_id == self.player_id
		username = self.game.p1_username if is_player_1 else self.game.p2_username
		avatar = self.game.p1_avatar if is_player_1 else self.game.p2_avatar
		message = {
			'type': 'player_connected',
			'player_id': self.player_id,
			'username': username,
			'avatar': avatar,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_game_start(self, game, player1, player2):
		message = {
			'type': 'game_start',
			'game_id': game['id'],
			'player1_id': game['p1_id'],
			'player2_id': game['p2_id'],
			'player1_name': game['p1_username'],
			'player2_name': game['p2_username'],
			'player1_avatar': game['p1_avatar'],
			'player2_avatar': game['p2_avatar'],
			'player1_life': player1.life,
			'player2_life': player2.life,
		}
		await self.channel_layer.group_send(self.game.group_name, message)

	async def notify_player_ready(self):
		message = {
			'type': 'player_ready',
			'player_id': self.player_id,
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

	async def game_cancel(self, event):
		message = {
			'type': 'game_cancel',
			'player_id': event['player_id'],
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

	async def looser(self, event):
		message = {
			'type': 'looser',
			'player_id': event['player_id'],
		}
		await self.send(text_data=json.dumps(message))

	async def round_interaction(self, event):
		message = {
			'type': 'round_interaction',
			'player_id': event['player_id'],
			'power': event['power'],
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
			'game_id': event['game_id'],
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
			'player_id': event['player_id'],
		}
		await self.send(text_data=json.dumps(message))

	async def game_message(self, event):
		message = {
			'type': 'game_message',
			'message': event['message'],
		}
		await self.send(text_data=json.dumps(message))
	async def start_countdown(self):
		countdown = 3
		while countdown >= 0:
			await self.notify_countdown(countdown)
			await asyncio.sleep(1)
			countdown -= 1