from asgiref.sync import sync_to_async
from django.core.cache import cache

class Player:
    def __init__(self, nb, player_info, game_id, ready = False, action = None, life=1):
        self.life = life
        self.nb = nb
        self.width = 3
        self.height = 7
        self.action = action
        print('init player:', player_info)
        self.id = player_info['id']
        self.username = player_info['username']
        self.avatar = player_info['avatar']
        self.ligue_points = player_info['ligue_points']
        self.ready = ready
        self.game_id = game_id

    def __repr__(self):
        return f"Player(id={self.id}, nb={self.nb}, life={self.life}, action={self.action})"

    # @staticmethod
    # async def get_players_of_game(p1_id, p2_id, game_id):
    #     players = []
    #     p1 = await Player.create_player_from_cache(p1_id, game_id)
    #     p2 = await Player.create_player_from_cache(p2_id, game_id)
    #     if p1 is None or p2 is None:
    #         return None
    #     players.append(p1)
    #     players.append(p2)
    #     return players

    # @staticmethod
    # async def create_player_from_cache(player_id, game_id):
    #     player_cache = await Player.load_from_cache(player_id, game_id)
    #     if player_cache:
    #         p_life = player_cache['life']
    #         p_nb = player_cache['nb']
    #         p_action = player_cache['action']
    #         player = Player(p_nb, player_id, game_id, p_action, p_life)
    #         return player
    #     else:
    #         return None

    @staticmethod
    async def load_from_cache(player_id, game_id):
        cache_key = f'wizard_duel_player_{player_id}_{game_id}'
        data = await sync_to_async(cache.get)(cache_key)
        return data if data else None

    async def save_to_cache(self):
        cache_key = f'wizard_duel_player_{self.id}_{self.game_id}'
        print(f'save: {cache_key}')
        await sync_to_async(cache.set)(cache_key, {
            'life': self.life,
            'player_id': self.id,
            'game_id': self.game_id,
            'nb': self.nb,
            'action': self.action
        }, timeout= 3600)


    def delete_from_cache(self):
        cache_key = f'wizard_duel_player_{self.id}_{self.game_id}'
        print(f'delete: {cache_key}, ')
        cache.delete(cache_key)

    async def lose_life(self):
        self.life -= 1
        await self.save_to_cache()

    async def assign_action(self, action):
        self.action = action
        await self.save_to_cache()

    async def update_player(self):
        player_cache = await self.load_from_cache(self.id, self.game_id)
        if player_cache:
            self.life = player_cache['life']
            self.action = player_cache['action']
            return 0
        else:
            return -1
            