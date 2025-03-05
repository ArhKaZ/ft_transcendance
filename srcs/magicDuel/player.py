from asgiref.sync import sync_to_async
from django.core.cache import cache

class Player:
		
	def __init__(self, nb, player_info, game_id, ready = False, action = None, life=3):
		self.life = life
		self.nb = nb
		self.width = 3
		self.height = 7
		self.action = action
		self.id = player_info['id']
		self.username = player_info['username']
		self.avatar = player_info['avatar']
		self.ligue_points = player_info['ligue_points']
		self.ready = ready
		self.game_id = game_id
		self.nb_round_no_play = 0

	def __repr__(self):
		return f"Player(id={self.id}, nb={self.nb}, life={self.life}, action={self.action})"

	@staticmethod
	async def load_from_cache(player_id, game_id):
		cache_key = f'wizard_duel_player_{player_id}_{game_id}'
		data = await sync_to_async(cache.get)(cache_key)
		return data if data else None

	async def save_to_cache(self):
		cache_key = f'wizard_duel_player_{self.id}_{self.game_id}'
		await sync_to_async(cache.set)(cache_key, {
			'life': self.life,
			'player_id': self.id,
			'game_id': self.game_id,
			'nb': self.nb,
			'action': self.action,
			'no_play': self.nb_round_no_play
		}, timeout= 3600)

	async def delete_from_cache(self):
		cache_key = f'wizard_duel_player_{self.id}_{self.game_id}'
		await sync_to_async(cache.delete)(cache_key)

	async def lose_life(self):
		print(f"Player {self.id} losing life: {self.life} -> {self.life - 1}")
		self.life -= 1
		await self.save_to_cache()

	async def assign_action(self, action):
		self.action = action
		await self.save_to_cache()

	async def update_player(self):
		player_cache = await self.load_from_cache(self.id, self.game_id)
		if player_cache:
			if not player_cache['life'] > self.life:
				old_life = self.life
				self.life = player_cache['life']
				if old_life != self.life:
					print(f"Player {self.id} life updated from cache: {old_life} -> {self.life}")
			self.action = player_cache['action']
			self.nb_round_no_play = player_cache['no_play']
			return 0
		else:
			return -1
		
	async def check_have_played(self):
		if self.action == None:
			self.nb_round_no_play += 1
		else: 
			self.nb_round_no_play = 0
		await self.save_to_cache()
			