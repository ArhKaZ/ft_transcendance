from asgiref.sync import sync_to_async
from django.core.cache import cache

class Player:
    def __init__(self, nb, player_id, game_id, action = None, life=1):
        self.life = life
        self.game_id = game_id
        self.player_id = player_id
        self.nb = nb
        self.width = 3
        self.height = 7
        self.action = action

    def __repr__(self):
        return f"Player(id={self.player_id}, nb={self.nb}, life={self.life}, action={self.action})"

    @staticmethod
    async def get_players_of_game(p1_id, p2_id, game_id):
        players = []
        p1 = await Player.create_player_from_cache(p1_id, game_id)
        p2 = await Player.create_player_from_cache(p2_id, game_id)
        if p1 is None or p2 is None:
            return None
        players.append(p1)
        players.append(p2)
        return players

    @staticmethod
    async def create_player_from_cache(player_id, game_id):
        player_cache = await Player.load_from_cache(player_id, game_id)
        if player_cache:
            p_life = player_cache['life']
            p_nb = player_cache['nb']
            p_action = player_cache['action']
            player = Player(p_nb, player_id, game_id, p_action, p_life)
            return player
        else:
            return None

    @staticmethod
    async def load_from_cache(player_id, game_id):
        cache_key = f'wizard_duel_player_{player_id}_{game_id}'
        data = await sync_to_async(cache.get)(cache_key)
        return data if data else None

    async def save_to_cache(self):
        cache_key = f'wizard_duel_player_{self.player_id}_{self.game_id}'
        await sync_to_async(cache.set)(cache_key, {
            'life': self.life,
            'player_id': self.player_id,
            'game_id': self.game_id,
            'nb': self.nb,
            'action': self.action
        }, timeout= 3600)

        # player_sessions_key = f'wizard_duel_sessions_game_{self.game_id}'
        # current_sessions = cache.get(player_sessions_key) or []
        # if self.player_id not in current_sessions:
        #     current_sessions.append(self.player_id)
        #     await sync_to_async(cache.set)(player_sessions_key, current_sessions)

    def delete_from_cache(self):
        cache.delete(f'wizard_duel_player_{self.player_id}_{self.game_id}')

    @staticmethod
    async def reset_action(p1_id, p2_id, game_id):
        players = await Player.get_players_of_game(p1_id, p2_id, game_id)
        if players is None:
            return
        if players[0].action is None and players[1].action is None:
            return
        for player in players:
            player.action = None
            await player.save_to_cache()

    async def lose_life(self):
        self.life -= 1
        await self.save_to_cache()
        print(self.life)