from django.core.cache import cache
from django.template.context_processors import static


class Player:
    def __init__(self, session_id, game_id):
        self.y = 50.0
        self.nb = 0
        self.speed = 0.5
        self.game_id = game_id
        self.session_id = session_id

    def set_y(self, y):
        self.y = y

    def move(self, direction):
        if direction == 'up':
            self.y -= self.speed
        else:
            self.y += self.speed

    def save_to_cache(self):
        cache_key = f'player_{self.session_id}_{self.game_id}_pos'
        cache.set(cache_key, {
            'y': self.y,
            'session_id': self.session_id,
            'game_id': self.game_id,
        })

        player_sessions_key = f'sessions_game_{self.game_id}'
        current_sessions = cache.get(player_sessions_key) or []

        if self.session_id not in current_sessions:
            current_sessions.append(self.session_id)
            cache.set(player_sessions_key, current_sessions)

    @staticmethod
    def get_players_of_game(game_id):
        player_sessions_key = f'sessions_game_{game_id}'
        sessions_ids = cache.get(player_sessions_key) or []

        players = []
        for session_id in sessions_ids:
            cache_key = f'player_{session_id}_{game_id}_pos'
            player = cache.get(cache_key)
            if player:
                players.append(player)

        return players

    @staticmethod
    def load_from_cache(session_id, game_id):
        cache_key = f'player_{session_id}_{game_id}_pos'
        data = cache.get(cache_key)
        if data:
            return data
        else:
            return None