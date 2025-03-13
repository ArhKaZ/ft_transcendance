import asyncio
import time

from channels.layers import get_channel_layer
from django.core.cache import cache
from asgiref.sync import sync_to_async
from .player import Player
from .ball import Ball

class PongGame:

	@property
	def winner(self):
		return self.p1 if self.p1.score > self.p2.score else self.p2

	@property
	def loser(self):
		return self.p2 if self.p1.score > self.p2.score else self.p1

	def __init__(self, player_info, opponent_info, game_id, p1_ready = False, p2_ready = False):
		self.game_id = game_id
		self.p1 = Player(player_info, game_id, p1_ready)
		self.p2 = Player(opponent_info, game_id, p2_ready)
		self.ball = Ball(game_id)
		self.status = "WAITING"
		self.group_name = f"game_pong_{self.game_id}"
		self.bound_wall = False
		self.bound_player = False
		self._lock = asyncio.Lock()
		self.events = {
			'game_cancelled': asyncio.Event(),
			'ball_reset': asyncio.Event(),
			'game_finished': asyncio.Event()
		}
		self.events['ball_reset'].set()
		self.can_move = False
		self.last_update_time = time.time()
		self.ball_update_task = None
		self.ball_update_callbacks = set()
		self.is_stocked = False

	def __repr__(self):
		return f"Game {self.game_id} {self.status}"

	async def cancel_game(self, player_id = -1, username = None):
		async with self._lock:
			if self.status == 'CANCELLED':
				return
			self.status = 'CANCELLED'
			self.events['game_cancelled'].set()
			if not self.p1:
				id_winner = self.p2.id
			elif not self.p2:
				id_winner = self.p1.id
			else:
				id_winner = self.p1.id if self.p2.id == player_id else self.p2.id
			channel_layer = get_channel_layer()
			await channel_layer.group_send(
				self.group_name,
				{
					'type': 'game_cancel',
					'message': f'Player {username} is gone, game is cancelled',
					'username': username,
					'game_status': self.status,
					'id': id_winner,
				}
			)
			await self.cleanup(player_id)
	
	@classmethod 
	async def create_from_cache(cls, game_data):
		player_info = {
			'id': game_data['p1_id'],
			'username' : game_data['p1_username'],
			'avatar' : game_data['p1_avatar']
		}
		opp_info = {
			'id' : game_data['p2_id'],
			'username' : game_data['p2_username'],
			'avatar' : game_data['p2_avatar']
		}
		game = cls(player_info, opp_info, game_data['id'], game_data['p1_ready'], game_data['p2_ready'])
		game.status = game_data['status']
		return game

	async def start_game(self):
		if self.status == "IN_PROGRESS":
			return None

		self.status = "IN_PROGRESS"
		await self.save_to_cache()
		self.can_move = True
		self.ball_update_task = asyncio.create_task(self._run_ball_updates())
		self.is_first_update = True
		return self.get_start_state()

	async def _run_ball_updates(self):
		try:
			while (not self.events['game_cancelled'].is_set()
				and not self.events['game_finished'].is_set()):
				if not self.events['ball_reset'].is_set():
					await self.events['ball_reset'].wait()
					continue

				game_state = await self.update_game_state()
				if game_state:
					for queue in self.ball_update_callbacks:
						await queue.put(game_state)
				await asyncio.sleep(1/60)
		except Exception as e: 
			print(f"Error in ball update task : {e}")
		finally:
			for queue in self.ball_update_callbacks:
				await queue.put(None)

	async def ball_position_updates(self):
		queue = asyncio.Queue()
		self.ball_update_callbacks.add(queue)
		try:
			while True:
				update = await queue.get()
				if update is None:
					break
				yield update
		finally:
			self.ball_update_callbacks.remove(queue)

	def get_start_state(self):
		return {
			'player1_id': self.p1.id,
			'player1_username': self.p1.username,
			'player1_avatar': self.p1.avatar,
			'player2_id': self.p2.id,
			'player2_username': self.p2.username,
			'player2_avatar': self.p2.avatar
		}

	async def update_game_state(self):
		await self.update_players()
		self.reset_bounds()

		has_collision = await self.ball.update_position(self)

		if self.ball.is_resetting:
			self.ball.is_resetting = False
			await self.ball.save_to_cache()
			await self.handle_reset_delay()
			return self.get_current_state()
		if (has_collision 
	  		or self.is_first_update or
			self.ball.vector_as_change or
			time.time() - self.last_update_time > 0.1): 
			self.ball.vector_as_change = False
			self.is_first_update = False
			self.last_update_time = time.time()
			return self.get_current_state()
		return None

	async def cleanup(self, player_id = -1):

		if self.ball_update_task and not self.ball_update_task.done():
			self.ball_update_task.cancel()
			try:
				await self.ball_update_task
			except asyncio.CancelledError:
				pass

		if player_id == -1:
			return
		if self.p1 and player_id == self.p1.id:
			await self.p1.delete_from_cache()
			self.p1 = None
		elif self.p2 and player_id == self.p2.id:
			await self.p2.delete_from_cache()
			self.p2 = None

		self.events['game_finished'].set()
		self.can_move = False


	def get_current_state(self):
		return {
			'x': self.ball.x,
			'y': self.ball.y,
			'vx': self.ball.vx, 
			'vy': self.ball.vy,
			'bound_player': self.bound_player,
			'bound_wall': self.bound_wall
		}

	async def handle_reset_delay(self):
		self.can_move = False
		await asyncio.sleep(1)
		self.can_move = True

	async def move_player(self, player_id, direction):
		if not self.can_move:
			return None
		player = self.p1 if player_id == self.p1.id else self.p2
		player.move(direction)
		await player.save_to_cache()
		return {'y': player.y, 'id': player.id}

	async def set_player_ready(self, player_id):
		game_data = await sync_to_async(cache.get)(f'game_pong_{self.game_id}')
		if game_data:
			self.p1.ready = game_data['p1_ready']
			self.p2.ready = game_data['p2_ready']
		if player_id == self.p1.id:
			self.p1.ready = True
			await self.p1.save_to_cache()
		else:
			self.p2.ready = True
			await self.p2.save_to_cache()
		await self.save_to_cache()
		return self.both_players_ready()
		
	def both_players_ready(self):
		return self.p1.ready and self.p2.ready

	def is_empty(self):
		return self.p1 is None and self.p2 is None

	def reset_bounds(self):
		self.bound_wall = False
		self.bound_player = False

	async def handle_player_disconnect(self, player_id):
		self.status = 'CANCELLED'
		await self.save_to_cache()

		if player_id == self.p1.id:
			await self.p1.delete_from_cache()
			self.p1 = None
		elif player_id == self.p2.id:
			await self.p2.delete_from_cache()
			self.p2 = None

	async def save_to_cache(self):
		cache_key = f'game_pong_{self.game_id}'
		await sync_to_async(cache.set)(cache_key, self.to_dict())

	def to_dict(self):
		return {
			'id': self.game_id,
			'p1_id': self.p1.id,
			'p2_id': self.p2.id,
			'p1_username': self.p1.username,
			'p2_username': self.p2.username,
			'p1_avatar': self.p1.avatar,
			'p2_avatar': self.p2.avatar,
			'p1_ready' : self.p1.ready,
			'p2_ready' : self.p2.ready,
			'status': self.status,
			'group_name': self.group_name
		}

	async def update_players(self):
		p1_data = await sync_to_async(cache.get)(f'player_{self.p1.id}_{self.game_id}')
		p2_data = await sync_to_async(cache.get)(f'player_{self.p2.id}_{self.game_id}')

		if p1_data:
			self.p1.y = p1_data['y']
		if p2_data:
			self.p2.y = p2_data['y']
