from asgiref.sync import sync_to_async
from asgiref.timeout import timeout
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from .player import Player
from .game_map import GameMap

import asyncio
import json

class PixelPawsConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._game_lock = asyncio.Lock()
        self._ready_lock = asyncio.Lock()
        self._broadcast_lock = asyncio.Lock()

    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.player_id = int(self.scope['url_route']['kwargs']['current_player_id'])
        self.game_group_name = f'pp_game_{self.game_id}'

        if not await self.initialize_game():
            await self.close()
            return

        await self.channel_layer.group_add(self.game_group_name, self.channel_name)
        await self.accept()

        async with self._broadcast_lock:
            await self.notify_player_connected()

    async def initialize_game(self):
        self.game = await self.get_game_from_cache(self.game_id)
        if not self.game:
            return False

        return True

    async def disconnect(self, close_code):
        print(f"Disconnect player {self.player_id} from game {self.game_id}")
        await self.handle_disconnect()
        await self.cleanup()

    async def cleanup(self):
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def handle_disconnect(self):
        print(f"Handling disconnect from player {self.player_id} from game {self.game_id}")
        game = await self.get_game_from_cache(self.game_id)
        cache_key = f'game_update_{self.game_id}'

        with cache.lock(cache_key):
            if game['player1'] == self.player_id:
                if game['player2'] and game['player2_name']:
                    game['player1_name'] = game['player2_name']
                    game['player1'] = game['player2']
                    game['player1_ready'] = game['player2_ready']
                    game['player2'] = None
                    game['player2_name'] = None
                    game['player2_ready'] = False
                else:
                    await self.remove_game_from_cache(self.game_id)
                    print(f"Game {self.game_id} removed from cache")
                    return
            elif game['player2'] == self.player_id:
                game['player2'] = None
                game['player2_name'] = None
                game['player2_ready'] = False
            elif game['player2'] is None and game['player1'] == self.player_id:
                await self.remove_game_from_cache(self.game_id)
                print(f"Game {self.game_id} removed from cache")
                return

            game['status'] = 'WAITING'
            await self.set_game_to_cache(self.game_id, game)

        print(f"Update game state: {game}")
        await self.send_players_info(game)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data['action']

        actions = {
            'ready': self.handle_player_ready,
            'key_inputs': self.handle_key_inputs,
        }

        handler = actions.get(action)
        if handler:
            await handler(data)
        await actions.get(action, lambda: None)(data)

    async def handle_player_ready(self, data):
        async with self._ready_lock:
            game = await self.get_game_from_cache(self.game_id)
            if game['player1'] == data['player_id'] and game['player1_ready']:
                return
            if game['player2'] == data['player_id'] and game['player2_ready']:
                return

            await self.async_set_player_ready(data['player_id'])
            async with self._broadcast_lock:
                message = {
                    'type': 'player_ready',
                    'player_id': data['player_id'],
                }
                await self.channel_layer.group_send(self.game_group_name, message)

            await self.check_both_ready()

    async def handle_key_inputs(self, data):
        player_id = data['playerId']

        actions = await Player.apply_action(data['inputs'], player_id, self.game_id)
        if actions is not None:
            for action in actions:
                await self.notify_animation(action[1], action[0])

    async def check_both_ready(self):
        async with self._game_lock:
            game = await self.get_game_from_cache(self.game_id)
            if not game:
                return

            if game.get('status') == 'IN_PROGRESS':
                return

            if game.get('player1_ready') and game.get('player2_ready'):
                game['status'] = 'IN_PROGRESS'
                await self.set_game_to_cache(self.game_id, game)

                map = await self.create_gamemap()
                player1, player2 = await self.create_players(game)

                async with self._broadcast_lock:
                    await self.notify_game_start(game, map, player1, player2)
                    self.send_player_pos = asyncio.create_task(self.send_player_position())

    async def create_gamemap(self):
        map = await GameMap.get_from_cache(self.game_id)
        if map is None:
            map = GameMap(self.game_id)
            await map.save_to_cache()
            map = None
            map = await GameMap.get_from_cache(self.game_id)
        return map

    async def create_players(self, game):
        player1 = await Player.create_player_from_cache(game['player1'], self.game_id)
        player2 = await Player.create_player_from_cache(game['player2'], self.game_id)
        await player1.assign_pos_player()
        await player2.assign_pos_player()
        await player1.save_to_cache()
        await player2.save_to_cache()
        return player1, player2

    @database_sync_to_async
    def get_game_from_cache(self, game_id):
        return cache.get(f'pp_game_{game_id}')

    async def async_set_player_ready(self, player_id):
         player = await self.set_player_ready(player_id)
         if player:
            await player.save_to_cache()

    @database_sync_to_async
    def set_player_ready(self, player_id):
        cache = caches['default']
        cache_key = f'pp_game_{self.game_id}'
        nb = 0
        with cache.lock(f'{cache_key}_lock'):
            game = cache.get(cache_key)
            if not game:
                return None
            if game['player1'] == player_id:
                game['player1_ready'] = True
                nb = 1
            elif game['player2'] == player_id:
                game['player2_ready'] = True
                nb = 2
            cache.set(cache_key, game, timeout=60 * 30)
            return Player(nb, player_id, self.game_id)

    @database_sync_to_async
    def remove_game_from_cache(self, game_id):
        cache.delete(f'pp_game_{game_id}')

    async def set_game_to_cache(self, game_id, game):
        cache = caches['default']
        await sync_to_async(cache.set)(f'pp_game_{game_id}', game, timeout=60*30)

    async def send_player_position(self):
        while True:
            try:
                players = await Player.get_players_of_game(self.game_id)
                await self.broadcast_player_position(players)
            except asyncio.CancelledError:
                print('canceled')
                break
            except Exception as e:
                print(f'Error in send_player_position: {e}')
            finally:
                await asyncio.sleep(0.20)

    async def broadcast_player_position(self, players):
        message = {
            'type': 'players_position',
            # 'player1_id': players[0].player_id,
            # 'player2_id': players[1].player_id,
            'player1_x': players[0].x,
            'player1_y': players[0].y,
            'player2_x': players[1].x,
            'player2_y': players[1].y,
        }
        await self.channel_layer.group_send(self.game_group_name, message)


    async def players_position(self, event):
        message = {
            'type': 'players_position',
            'player1_x': event['player1_x'],
            'player1_y': event['player1_y'],
            'player2_x': event['player2_x'],
            'player2_y': event['player2_y'],
        }
        await self.send(text_data=json.dumps(message))

    async def notify_animation(self, animation, player):
        # print(player.nb, player.x, player.y)
        message = {
            'type': 'animation',
            'animation': animation,
            'player_id': player.player_id,
            'player_x': player.x,
            'player_y': player.y,
            'player_look': player.look,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_player_connected(self):
        is_player_1 = self.game['player1'] == self.player_id
        username = self.game['player1_name'] if is_player_1 else self.game['player2_name']
        avatar = self.game['player1_avatar'] if is_player_1 else self.game['player2_avatar']
        message = {
            'type': 'player_connected',
            'player_id': self.player_id,
            'username': username,
            'avatar': avatar,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_game_start(self, game, map, player1, player2):
        message = {
            'type': 'game_start',
            'game_id': str(game['game_id']),
            'player1_id': game['player1'],
            'player2_id': game['player2'],
            'player1_name': game['player1_name'],
            'player2_name': game['player2_name'],
            'player1_avatar': game['player1_avatar'],
            'player2_avatar': game['player2_avatar'],
            'map_x': map['x'],
            'map_y': map['y'],
            'map_height': map['height'],
            'map_width': map['width'],
            'map_ground_y': map['ground_y'],
            'map_ground_x': map['ground_x'],
            'back_src': map['back_src'],
            'stage_src': map['stage_src'],
            'player1_x': player1.x,
            'player1_y': player1.y,
            'player2_x': player2.x,
            'player2_y': player2.y,
            'player1_life': player1.life,
            'player2_life': player2.life,
            'player1_percent': player1.percent,
            'player2_percent': player2.percent,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def send_players_info(self, game):
        message = {
            'type': 'players_info',
            'player1': game['player1'],
            'player1_name': game['player1_name'],
            'player1_ready': game['player1_ready'],
            'player1_avatar': game['player1_avatar'],
            'player2': game['player2'],
            'player2_name': game['player2_name'],
            'player2_ready': game['player2_ready'],
            'player2_avatar': game['player2_avatar'],
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def game_start(self, event):
        message = {
            'type': 'game_start',
            'game_id': event['game_id'],
            'player1_id': event['player1_id'],
            'player2_id': event['player2_id'],
            'player1_name': event['player1_name'],
            'player2_name': event['player2_name'],
            'player1_avatar': event['player1_avatar'],
            'player2_avatar': event['player2_avatar'],
            'map_x': event['map_x'],
            'map_y': event['map_y'],
            'map_height': event['map_height'],
            'map_width': event['map_width'],
            'map_ground_y': event['map_ground_y'],
            'map_ground_x': event['map_ground_x'],
            'back_src': event['back_src'],
            'stage_src': event['stage_src'],
            'player1_x': event['player1_x'],
            'player1_y': event['player1_y'],
            'player2_x': event['player2_x'],
            'player2_y': event['player2_y'],
            'player1_lifes': event['player1_life'],
            'player2_lifes': event['player2_life'],
            'player1_percent': event['player1_percent'],
            'player2_percent': event['player2_percent'],
        }
        await self.send(text_data=json.dumps(message))

    async def players_info(self, event):
        message = {
            'type': 'players_info',
            'player1': event['player1'],
            'player1_name': event['player1_name'],
            'player1_ready': event['player1_ready'],
            'player1_avatar': event['player1_avatar'],
            'player2': event['player2'],
            'player2_name': event['player2_name'],
            'player2_ready': event['player2_ready'],
            'player2_avatar': event['player2_avatar'],
        }
        await self.send(text_data=json.dumps(message))

    async def animation(self, event):
        message = {
            'type': 'animation',
            'animation': event['animation'],
            'player_id': event['player_id'],
            'player_x': event['player_x'],
            'player_y': event['player_y'],
            'player_look': event['player_look'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_connected(self, event):
        message = {
            'type': 'player_connected',
            'player_id': event['player_id'],
            'username': event['username'],
            'avatar': event['avatar'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_ready(self, event):
        message = {
            'type': 'player_ready',
            'player_id': event['player_id'],
        }
        await self.send(text_data=json.dumps(message))

    async def game_message(self, event):
        message = {
            'type': 'game_message',
            'message': event['message'],
        }
        await self.send(text_data=json.dumps(message))