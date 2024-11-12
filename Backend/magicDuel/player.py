from asgiref.sync import sync_to_async
from django.core.cache import cache

class Player:
    def __init__(self, nb, player_id, game_id, life=3):
        self.life = life
        self.game_id = game_id
        self.player_id = player_id
        self.nb = nb
        self.width = 3
        self.height = 7

    @classmethod
    async def get_players_of_game(cls, game_id):
        player_sessions_key = f'pp_sessions_game_{game_id}'
        players_ids = await sync_to_async(cache.get)(player_sessions_key) or []
        players = []
        for player_id in players_ids:
            cache_key = f'pp_player_{player_id}_{game_id}'
            player_data = await sync_to_async(cache.get)(cache_key)
            if player_data:
                player = cls(len(players) + 1, player_id, game_id)
                player.life = player_data['life']
                players.append(player)
        return players

    @staticmethod
    async def create_player_from_cache(player_id, game_id):
        player_cache = await Player.load_from_cache(player_id, game_id)
        if player_cache:
            p_life = player_cache['life']
            p_nb = player_cache['nb']
            player = Player(p_nb, player_id, game_id, p_life)
            return player
        else:
            return None

    @staticmethod
    async def load_from_cache(player_id, game_id):
        cache_key = f'pp_player_{player_id}_{game_id}'
        data = await sync_to_async(cache.get)(cache_key)
        return data if data else None

    async def save_to_cache(self):
        cache_key = f'pp_player_{self.player_id}_{self.game_id}'
        await sync_to_async(cache.set)(cache_key, {
            'life': self.life,
            'player_id': self.player_id,
            'game_id': self.game_id,
            'look': self.look,
            'nb': self.nb
        })

        player_sessions_key = f'pp_sessions_game_{self.game_id}'
        current_sessions = cache.get(player_sessions_key) or []
        if self.player_id not in current_sessions:
            current_sessions.append(self.player_id)
            await sync_to_async(cache.set)(player_sessions_key, current_sessions)