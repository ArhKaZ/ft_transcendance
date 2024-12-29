from django.core.cache import cache
from asgiref.sync import sync_to_async
from .player import Player


class Game:
	def __init__(self, player_info, opponent_info, game_id):
		self.game_id = game_id
		self.p1_id = player_info['id']
		self.p2_id = opponent_info['id']
		self.p1_username = player_info['username']
		self.p2_username = opponent_info['username']
		self.p1_avatar = player_info['avatar']
		self.p2_avatar = opponent_info['avatar']
		self.p1_ready = False
		self.p2_ready = False
		self.status = "WAITING"
		self.group_name = f"wizard_duel_game_{self.game_id}"

	async def save_to_cache(self):
		cache_key = f'wizard_duel_game_{self.game_id}'
		await sync_to_async(cache.set)(cache_key, self.to_dict())

	def to_dict(self):
		return {
			'id': self.game_id,
			'p1_id': self.p1_id,
			'p2_id': self.p2_id,
			'p1_username': self.p1_username,
			'p2_username': self.p2_username,
			'p1_avatar': self.p1_avatar,
			'p2_avatar': self.p2_avatar,
			'p1_ready' : self.p1_ready,
			'p2_ready' : self.p2_ready,
			'status': self.status,
			'group_name': self.group_name
		}

	def get_game_id(self):
		return self.game_id
	
	def both_players_ready(self):
		return self.p1_ready and self.p2_ready
	
	def remove_from_cache(self):
		cache.delete(f'player_current_game_{self.p1_id}')
		cache.delete(f'player_current_game_{self.p2_id}')
		cache.delete(f'game_pong_{self.game_id}')

	async def set_a_player_ready(self, player_id):
		new_game = await self.get_game_from_cache(self.game_id)
		nb = 0
		self.p1_ready = new_game.p1_ready
		self.p2_ready = new_game.p2_ready
		if player_id == self.p1_id:
			self.p1_ready = True 
			nb = 1
		else:
			self.p2_ready = True
			nb = 2
		await self.save_to_cache()
		return nb
	
	@classmethod
	async def get_game_from_cache(cls, game_id):
		game = cache.get(f"wizard_duel_game_{game_id}")
		
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
	
	def delete_player(self, nb):
		if nb == 1:
			self.p1_id = None
			self.p1_avatar = None
			self.p1_username = None
			self.p1_ready = False
		elif nb == 2:
			self.p2_id = None
			self.p2_avatar = None
			self.p2_username = None
			self.p2_ready = False
