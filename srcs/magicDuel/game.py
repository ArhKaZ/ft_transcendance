from django.core.cache import cache
from asgiref.sync import sync_to_async
from .player import Player

class Game:
	def __init__(self, player_info, opponent_info, game_id, p1_ready = False, p2_ready = False):
		self.game_id = game_id
		self.status = "WAITING"
		self.group_name = f"wizard_duel_game_{self.game_id}"
		self.p1 = Player(1, player_info, game_id, p1_ready)
		self.p2 = Player(2, opponent_info, game_id, p2_ready)
		self.stocked = False

	async def save_to_cache(self):
		cache_key = f'wizard_duel_game_{self.game_id}'
		await sync_to_async(cache.set)(cache_key, self.to_dict())
		self.p1.save_to_cache()
		self.p2.save_to_cache()

	def to_dict(self):
		return {
			'id': getattr(self, 'game_id', None),
			'p1_id': getattr(getattr(self, 'p1', None), 'id', None),
			'p2_id': getattr(getattr(self, 'p2', None), 'id', None),
			'p1_username': getattr(getattr(self, 'p1', None), 'username', None),
			'p2_username': getattr(getattr(self, 'p2', None), 'username', None),
			'p1_avatar': getattr(getattr(self, 'p1', None), 'avatar', None),
			'p2_avatar': getattr(getattr(self, 'p2', None), 'avatar', None),
			'p1_ready': getattr(getattr(self, 'p1', None), 'ready', None),
			'p2_ready': getattr(getattr(self, 'p2', None), 'ready', None),
			'p1_ligue_points': getattr(getattr(self, 'p1', None), 'ligue_points', None),
			'p2_ligue_points': getattr(getattr(self, 'p2', None), 'ligue_points', None),
			'status': getattr(self, 'status', None),
			'group_name': getattr(self, 'group_name', None),
			'stocked': getattr(self, 'stocked', None),
		}

	def get_game_id(self):
		return self.game_id
	
	def both_players_ready(self):
		return self.p1.ready and self.p2.ready
	
	async def remove_from_cache(self):
		await cache.delete(f'wizard_duel_game_{self.game_id}')

	async def set_a_player_ready(self, player_id):
		new_game = await self.get_game_from_cache(self.game_id)
		self.p1.ready = new_game.p1.ready
		self.p2.ready = new_game.p2.ready
		if player_id == self.p1.id:
			self.p1.ready = True 
			await self.p1.save_to_cache()
		else:
			self.p2.ready = True
			await self.p2.save_to_cache()
		await self.save_to_cache()
	
	@classmethod
	async def get_game_from_cache(cls, game_id):
		game = await sync_to_async(cache.get)(f"wizard_duel_game_{game_id}")
		if game is None:
			return None
		
		player_info= {
			'id': game['p1_id'],
			'username': game['p1_username'],
			'avatar': game['p1_avatar'],
			'ligue_points': game['p1_ligue_points']
		}

		opponent_info= {
			'id': game['p2_id'],
			'username': game['p2_username'],
			'avatar': game['p2_avatar'],
			'ligue_points': game['p2_ligue_points']
		}

		game_instance = cls(player_info, opponent_info, game_id, game['p1_ready'], game['p2_ready'])

		p1_cache = await Player.load_from_cache(game['p1_id'], game_id)
		p2_cache = await Player.load_from_cache(game['p2_id'], game_id)

		if p1_cache:
			game_instance.p1.life = p1_cache['life']
			game_instance.p1.action = p1_cache['action']
			game_instance.p1.nb_round_no_play = p1_cache['no_play']
			
		if p2_cache:
			game_instance.p2.life = p2_cache['life']
			game_instance.p2.action = p2_cache['action']
			game_instance.p2.nb_round_no_play = p2_cache['no_play']

		game_instance.game_id = game['id']
		game_instance.status = game['status']
		game_instance.group_name = game['group_name']

		return game_instance


	async def handle_player_disconnect(self, player_id):
		self.status = 'CANCELLED'

		if player_id == self.p1.id:
			await self.p1.delete_from_cache()
			self.p1 = None
		elif player_id == self.p2.id:
			await self.p2.delete_from_cache()
			self.p2 = None

		if self.p1 is None and self.p2 is None:
			await self.remove_from_cache()
	
	async def update_game(self):
		newGame = await sync_to_async(cache.get)(f"wizard_duel_game_{self.game_id}")
		if not newGame or not self.p1 or not self.p2:
			return 
		self.status = newGame['status']
		self.stocked = newGame['stocked']
		await self.update_players()

	async def update_status_game(self):
		newGame = await sync_to_async(cache.get)(f"wizard_duel_game_{self.game_id}")
		if not newGame: 
			return
		self.status = newGame['status']

	async def update_players(self):
		if await self.p1.update_player() == -1:
			self.p1 = None
		if await self.p2.update_player() == -1:
			self.p2 = None

	async def check_players_have_played(self): 
		await self.p1.check_have_played()
		await self.p2.check_have_played()
		if self.p1.nb_round_no_play >= 4 and self.p2.nb_round_no_play >= 4:
			return {"p_id": self.p1.id, "p2_id": self.p2.id, "p_name": self.p1.username, "p2_name": self.p2.username}
		elif self.p1.nb_round_no_play >= 4:
			return {"p_id": self.p1.id, "p2_id": None, "p_name": self.p1.username, "p2_name": None}
		elif self.p2.nb_round_no_play >= 4:
			return {"p_id": None, "p2_id": self.p2.id, "p_name": None, "p2_name": self.p2.username}
		return None
	
	async def is_stocked(self):
		await self.update_game()
		return self.stocked
	
	async def set_stocked(self):
		self.stocked = True
		await self.save_to_cache()
