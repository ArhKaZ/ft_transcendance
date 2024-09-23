from django.core.cache import cache

class Player:
    def __init__(self, session_id, game_id):
        self.y = 50.0
        self.nb = 0
        self.speed = 0.5
        self.game_id = game_id
        self.session_id = session_id

    def move(self, direction):
        if direction == 'up':
            self.y -= self.speed
        else:
            self.y += self.speed

    def save_to_cache(self):
        cache_key = f'player{self.session_id}_{self.game_id}_pos'
        print(f'Saving to cache with key: {cache_key}, value: {self.y}')  # Debugging
        cache.set(cache_key, self)

    @staticmethod
    def load_from_cache(session_id, game_id):
        cache_key = f'player{session_id}_{game_id}_pos'
        print(f'Loading from cache with key: {cache_key}')  # Debugging
        data = cache.get(cache_key)
        if data:
            print(f'Data found in cache: {data}')  # Debugging
            return data
        else:
            print('No data found in cache')  # Debugging
            return None