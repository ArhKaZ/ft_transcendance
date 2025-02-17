import asyncio

from django.core.cache import cache
from asgiref.sync import sync_to_async
from .player import Player
from .ball import Ball

class PongGame:
	def __init__(self, player_info, opponent_info, game_id, p1_ready = False, p2_ready = False):
		self.game_id = game_id
		self.p1 = Player(player_info, game_id, p1_ready)
		self.p2 = Player(opponent_info, game_id, p2_ready)
		self.ball = Ball(game_id)
		self.status = "WAITING"
		self.group_name = f"game_pong_{self.game_id}"
		self.bound_wall = False
		self.bound_player = False
		self.can_move = asyncio.Event()
		self.can_move.set()
		self.is_finished = False
		self.ball_update_task = None
		self.ball_update_callbacks = set()
		self.game_cancel_event = asyncio.Event()
		self.ball_reset_event = asyncio.Event()
		self.ball_reset_event.set()

	def __repr__(self):
		return f"Game {self.game_id} {self.status}"

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
		self.status = "IN_PROGRESS"
		await self.save_to_cache()
		await self.set_can_move(False)
		self.ball_update_task = asyncio.create_task(self._run_ball_updates())
		self.is_first_update = True
		return self.get_start_state()

	async def _run_ball_updates(self):
		try:
			while not self.game_cancel_event.is_set():
				if not self.ball_reset_event.is_set():
					await self.ball_reset_event.wait()
					continue

				game_state = await self.update_game_state()
				if game_state:
					for queue in self.ball_update_callbacks:
						await queue.put(game_state)
				await asyncio.sleep(0.016)
		except asyncio.CancelledError:
			print("ball update task cancelled")
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
		await self.ball.update_ball()
		await self.update_players()
		self.reset_bounds()

		if self.ball.is_resetting:
			self.ball.is_resetting = False
			await self.ball.save_to_cache()
			await self.handle_reset_delay()
			return None
		
		has_collision = await self.ball.update_position(self)
		if has_collision or self.is_first_update:
			print('return something on update_game_state')
			self.is_first_update = False
			return self.get_current_state()
		return None

	async def cleanup(self):
		self.game_cancel_event.set()
		if self.ball_update_task:
			self.ball_update_task.cancel()
			try:
				await self.ball_update_task
			except asyncio.CancelledError:
				pass

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
		await self.set_can_move(False)
		await asyncio.sleep(1)
		await self.set_can_move(True)

	async def move_player(self, player_id, direction):
		if not await self.get_can_move():
			return None
		player = self.p1 if player_id == self.p1.id else self.p2
		player.move(direction)
		await self.save_to_cache()
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

	async def set_can_move(self, value):
		await sync_to_async(cache.set)(f'can_move_{self.game_id}', value)

	async def get_can_move(self):
		return await sync_to_async(cache.get)(f'can_move_{self.game_id}')

	def is_empty(self):
		return self.p1 is None and self.p2 is None

	def reset_bounds(self):
		self.bound_player = False
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

	# def get_game_id(self):
	# 	return self.game_id
	
	# def remove_from_cache(self):
	# 	cache.delete(f'game_pong_{self.game_id}')

	# async def set_a_player_ready(self, player_id):
	# 	new_game = await self.get_game_from_cache(self.game_id)
	# 	self.p1.ready = new_game.p1.ready
	# 	self.p2.ready = new_game.p2.ready
	# 	if player_id == self.p1.id:
	# 		self.p1.ready = True
	# 		await self.p1.save_to_cache()
	# 	else:
	# 		self.p2.ready = True
	# 		await self.p2.save_to_cache()
	# 	await self.save_to_cache()
	
	# @classmethod
	# async def get_game_from_cache(cls, game_id):
	# 	game = await sync_to_async(cache.get)(f"game_pong_{game_id}")
		
	# 	player_info= {
	# 		'id': game['p1_id'],
	# 		'username': game['p1_username'],
	# 		'avatar': game['p1_avatar']
	# 	}

	# 	opponent_info= {
	# 		'id': game['p2_id'],
	# 		'username': game['p2_username'],
	# 		'avatar': game['p2_avatar']
	# 	}
	# 	game_instance = cls(player_info, opponent_info, game_id, game['p1_ready'], game['p2_ready'])

	# 	game_instance.game_id = game['id']
	# 	game_instance.status = game['status']
	# 	game_instance.group_name = game['group_name']

	# 	return game_instance


	# async def get_players_of_game(self):
	# 	player1_data = await Player.load_from_cache(self.p1.id, self.game_id)
	# 	player2_data = await Player.load_from_cache(self.p2.id, self.game_id)
	# 	return [player1_data, player2_data]
	
	# async def update_game(self):
	# 	newGame = cache.get(f"game_pong_{self.game_id}")
	# 	self.status = newGame['status']
	# 	await self.update_players()

	# async def update_players(self):
	# 	if await self.p1.update_player() == -1:
	# 		self.p1 = None
	# 	if await self.p2.update_player() == -1:
	# 		self.p2 = None

	# async def handle_player_disconnect(self, player_id):
	# 	self.status = 'CANCELLED'
	# 	await self.save_to_cache()

	# 	if player_id == self.p1.id:
	# 		await self.p1.delete_from_cache()
	# 		self.p1 = None
	# 	elif player_id == self.p2.id:
	# 		await self.p2.delete_from_cache()
	# 		self.p2 = None
		
	# 	if self.p1 is None and self.p2 is None:
	# 		await self.remove_from_cache()

	# async def update_game(self):
	# 	await self.ball.update_ball()
	# 	await self.update_players()

	# def reset_bounds(self):
	# 	self.bound_player = False
	# 	self.bound_wall = False

	# async def move_player(self, id, direction):
	# 	player = self.p1 if id == self.p1.id else self.p2
	# 	player.move(direction)
	# 	await player.save_to_cache()
	# 	return ({'y': player.y, 'id': player.id})
		