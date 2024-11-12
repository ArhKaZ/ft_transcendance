from asgiref.sync import sync_to_async
from django.core.cache import cache
from .game_map import GameMap
from .handler_inputs import InputHandler
from .physics import PhysicsEngine


class Player:
    def __init__(self, nb, player_id, game_id, x=0, y=0, vx=0, vy=0, life=3, percent=0, look='left', jump=False, d_jump=True, ground=True):
        self.x = x
        self.y = y
        self.speed = 0.1
        self.life = life
        self.percent = percent
        self.game_id = game_id
        self.player_id = player_id
        self.nb = nb
        self.look = look
        self.width = 3
        self.height = 7

        self.velocity_x = vx
        self.velocity_y = vy
        self.is_jumping = jump
        self.has_double_jump = d_jump
        self.is_on_ground = ground

        self.physics = PhysicsEngine()

    async def update(self):
        if not self.is_on_ground:
            self.velocity_y = min(self.velocity_y + self.physics.gravity, self.physics.terminal_velocity)
        self.x += self.velocity_x
        self.y += self.velocity_y

        self.is_on_ground = False
        gamemap = await GameMap.get_from_cache(self.game_id)
        if self.check_platform_collision(gamemap):
            self.is_on_ground = True
            self.y = int(gamemap['ground_y']) - self.height
            self.velocity_y = 0
            self.has_double_jump = True
            self.is_jumping = False

        if self.is_on_ground:
            self.velocity_x *= 0.8
        else:
            self.velocity_x *= 0.95

        await self.save_to_cache()

    def check_platform_collision(self, gamemap):
        if self.y == int(gamemap['ground_y']) - self.height and int(gamemap['ground_x']) - self.width <= self.x <= int(
            gamemap['ground_x_end']):
            return True
        return False

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
                player.x = player_data['x']
                player.y = player_data['y']
                player.life = player_data['life']
                player.percent = player_data['percent']
                players.append(player)
        return players

    @staticmethod
    async def create_player_from_cache(player_id, game_id):
        player_cache = await Player.load_from_cache(player_id, game_id)
        if player_cache:
            p_x = player_cache['x']
            p_y = player_cache['y']
            p_vx = player_cache['velocity_x']
            p_vy = player_cache['velocity_y']
            p_life = player_cache['life']
            p_percent = player_cache['percent']
            p_nb = player_cache['nb']
            p_look = player_cache['look']
            p_jump = player_cache['is_jumping']
            p_d_jump = player_cache['has_double_jump']
            p_ground = player_cache['is_on_ground']
            player = Player(p_nb, player_id, game_id, p_x, p_y, p_vx, p_vy, p_life, p_percent, p_look, p_jump, p_d_jump, p_ground)
            return player
        else:
            return None

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
            self.x = gamemap['ground_x_end'] - 3
        self.y = gamemap['ground_y'] - 7

    @staticmethod
    async def apply_action(inputs, player_id, game_id):
        player = await Player.create_player_from_cache(player_id, game_id)
        if player is None:
            return # Error

        await player.update()

        return await Player.determine_action(player, inputs)

    @staticmethod
    async def determine_action(player, inputs):
        input_handler = InputHandler()

        actions = []
        for key, is_pressed in inputs.items():
            if is_pressed:
                result = await input_handler.handler(player, key)
                actions.append(result)

        if all(action is not None for action in actions):
            return actions
        else:
            return [(player, 'Idle')]

    async def save_to_cache(self):
        cache_key = f'pp_player_{self.player_id}_{self.game_id}'
        await sync_to_async(cache.set)(cache_key, {
            'x': self.x,
            'y': self.y,
            'velocity_x': self.velocity_x,
            'velocity_y': self.velocity_y,
            'life': self.life,
            'percent': self.percent,
            'is_jumping': self.is_jumping,
            'has_double_jump': self.has_double_jump,
            'is_on_ground': self.is_on_ground,
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