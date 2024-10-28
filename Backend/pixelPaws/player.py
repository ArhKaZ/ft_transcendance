from asgiref.sync import sync_to_async
from django.core.cache import cache
from .game_map import GameMap

class Player:
    def __init__(self, nb, player_id, game_id):
        self.x = 0
        self.y = 0
        self.speed = 0.8
        self.life = 3
        self.percent = 0
        self.game_id = game_id
        self.player_id = player_id
        self.nb = nb

    async def save_to_cache(self):
        cache_key = f'pp_player_{self.player_id}_{self.game_id}'
        await sync_to_async(cache.set)(cache_key, {
            'x': self.x,
            'y': self.y,
            'life': self.life,
            'percent': self.percent,
            'player_id': self.player_id,
            'game_id': self.game_id,
        })

        player_sessions_key = f'pp_sessions_game_{self.game_id}'
        current_sessions = cache.get(player_sessions_key) or []
        if self.player_id not in current_sessions:
            current_sessions.append(self.player_id)
            await sync_to_async(cache.set)(player_sessions_key, current_sessions)


    @classmethod
    async def get_players_of_game(cls, game_id):
        player_sessions_key = f'pp_sessions_game_{game_id}'
        players_ids = await sync_to_async(cache.get)(player_sessions_key) or []
        players = []
        for player_id in players_ids:
            cache_key = f'pp_player_{player_id}_{game_id}'
            player_data = await sync_to_async(cache.get)(cache_key)
            if player_data:
                player = cls(player_id, game_id)
                player.x = player_data['x']
                player.y = player_data['y']
                player.life = player_data['life']
                player.percent = player_data['percent']
                players.append(player)

        return players

    @staticmethod
    async def load_from_cache(player_id, game_id):
        cache_key = f'pp_player_{player_id}_{game_id}'
        data = await sync_to_async(cache.get)(cache_key)
        return data if data else None

    async def assign_pos_player(self):
        gamemap = await GameMap.get_from_cache(self.game_id)
        if self.nb == 1:
            self.x = gamemap['ground_x'] + 0.1
        else :
            self.x = gamemap['ground_x_end'] - 0.1
        self.y = gamemap['ground_y'] - 0.2
