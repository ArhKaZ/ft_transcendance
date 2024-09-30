import aioredis

from django.core.cache import cache
from django.template.context_processors import static

from backend import settings


class Player:
    def __init__(self, session_id, game_id):
        self.y = 50.0
        self.nb = 0
        self.speed = 0.9
        self.score = 0
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
        cache_key = f'player_{self.session_id}_{self.game_id}'
        cache.set(cache_key, {
            'y': self.y,
            'session_id': self.session_id,
            'game_id': self.game_id,
            'score': self.score,
        })
        print('jai save le cache pour le player')

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
            cache_key = f'player_{session_id}_{game_id}'
            player = cache.get(cache_key)
            if player:
                players.append(player)

        return players

    @staticmethod
    def load_from_cache(session_id, game_id):
        cache_key = f'player_{session_id}_{game_id}'
        data = cache.get(cache_key)
        if data:
            return data
        else:
            return None

    async def add_point(self):
        print(3.5)
        try:
            print(3.10)
            self.score += 1
            self.save_to_cache()
            print(3.11)
            redis = await aioredis.from_url(f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}')
            await redis.publish(f"game_update:{self.game_id}", "score_updated")
            print(3.12)
            if self.score >= 11:
                await redis.publish(f"game_update:{self.game_id}", f"game_finish_{self.session_id}")
            await redis.close()
        except aioredis.RedisError as e:
            print(f"Redis Error in add_point: {e}")
        except Exception as e:
            print(f"Exception in add_point: {e}")