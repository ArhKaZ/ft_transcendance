from django.core.cache import cache
from asgiref.sync import sync_to_async
from .player import Player

class Game:
	def __init__(self, player_info, opponent_info, game_id, p1_ready = False, p2_ready = False):
		self.game_id = game_id
		self.p1 = Player(player_info, game_id, p1_ready)
		self.p2 = Player(opponent_info, game_id, p2_ready)
		self.status = "WAITING"
		self.group_name = f"game_pong_{self.game_id}"

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

	def get_game_id(self):
		return self.game_id
	
	def both_players_ready(self):
		return self.p1.ready and self.p2.ready
	
	def remove_from_cache(self):
		cache.delete(f'game_pong_{self.game_id}')

	async def set_a_player_ready(self, player_id):
		new_game = await self.get_game_from_cache(self.game_id)
		self.p1_ready = new_game.p1.ready
		self.p2.ready = new_game.p2.ready
		if player_id == self.p1.id:
			self.p1.ready = True 
		else:
			self.p2.ready = True
		await self.save_to_cache()
	
	@classmethod
	async def get_game_from_cache(cls, game_id):
		game = cache.get(f"game_pong_{game_id}")
		
		player_info= {
			'id': game['p1_id'],
			'username': game['p1_username'],
			'avatar': game['p1_avatar']
		}

		opponent_info= {
			'id': game['p2_id'],
			'username': game['p2_username'],
			'avatar': game['p2_avatar']
		}
		game_instance = cls(player_info, opponent_info, game_id)

		game_instance.game_id = game['id']
		game_instance.p1_ready = game['p1_ready']
		game_instance.p2_ready = game['p2_ready']
		game_instance.status = game['status']
		game_instance.group_name = game['group_name']

		return game_instance


	async def get_players_of_game(self):
		player1_data = await Player.load_from_cache(self.p1.id, self.game_id)
		player2_data = await Player.load_from_cache(self.p2.id, self.game_id)
		return [player1_data, player2_data]
	
	async def update_game(self):
		newGame = cache.get(f"game_pong_{self.game_id}")
		self.status = newGame['status']
		self.update_players()

	async def update_players(self):
		if await self.p1.update_player() == -1:
			self.p1 = None
		if await self.p2.update_player() == -1:
			self.p2 = None

	async def handle_player_disconnect(self, player_id):
		self.status = 'CANCELLED'
		await self.save_to_cache()

		if player_id == self.p1.id:
			await self.p1.delete_from_cache()
			self.p1 = None
		elif player_id == self.p2.id:
			await self.p2.delete_from_cache()
			self.p2 = None
		
		if self.p1 is None and self.p2 is None:
			await self.remove_from_cache()
