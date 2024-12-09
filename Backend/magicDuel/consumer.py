from asgiref.sync import sync_to_async
from asgiref.timeout import timeout
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache, caches
from .player import Player

import asyncio
import json
import time

class MagicDuelConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._game_lock = asyncio.Lock()
        self._ready_lock = asyncio.Lock()
        self._broadcast_lock = asyncio.Lock()
        self._countdown_task = None
        self._game_loop_task = None
        self._start_round_task = None
        self._round_complete_event = asyncio.Event()
        self._countdown_done = asyncio.Event()
        self._both_anim_done = asyncio.Event()
        self._game_state = {}
        self.anim_state = {}
        self.current_round_count = 0

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
        await self.notify_game_cancel(self.player_id)
        await self.handle_disconnect()
        await self.cleanup()

    async def cleanup(self):
        if self._countdown_task:
            self._countdown_task.cancel()
        if self._game_loop_task:
            self._game_loop_task.cancel()
        if self._start_round_task:
            self._start_round_task.cancel()

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
            'attack': self.handle_player_attack,
            'finishAnim': self.handle_finish_anim,
        }

        handler = actions.get(action)
        if handler:
            await handler(data)

    async def handle_finish_anim(self, data):
        player_id = data['player_id']
        round = data['round']
        game_key = f"game_{self.game_id}_round_{round}_finished"
        ready_state = cache.get(game_key, {})
        if player_id in ready_state:
            ready_state[player_id] = True
            cache.set(game_key, ready_state)
            print(f"player {player_id} is ready for a new round")

        if all(ready_state.values()):
            print(f"all players are ready for a new round")
            self._both_anim_done.set()

    async def handle_player_attack(self, data):
        player = await Player.create_player_from_cache(data['player_id'], self.game_id)
        if not player:
            return
        player.action = data['choice']
        await player.save_to_cache()
        await self.notify_player_attack(data['player_id'])

    async def handle_player_ready(self, data):
        async with self._ready_lock:
            game = await self.get_game_from_cache(self.game_id)
            if not game:
                print("Error got no game in handle_player_ready")
                return

            if game['player1'] == data['player_id'] and game['player1_ready']:
                return
            if game['player2'] == data['player_id'] and game['player2_ready']:
                return

            await self.async_set_player_ready(data['player_id'])

            await self.notify_player_ready(data['player_id'])

            game = await self.get_game_from_cache(self.game_id)
            if game.get('player1_ready') and game.get('player2_ready'):
                await self.start_game_sequence(game)

    async def create_players(self, game):
        player1 = await Player.create_player_from_cache(game['player1'], self.game_id)
        player2 = await Player.create_player_from_cache(game['player2'], self.game_id)
        await player1.save_to_cache()
        await player2.save_to_cache()
        return player1, player2

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

    async def  start_game_sequence(self, game):
        game['status'] = 'IN_PROGRESS'
        await self.set_game_to_cache(self.game_id, game)

        player1, player2 = await self.create_players(game)

        self._game_state[self.game_id] = {
            'players': (player1, player2),
            'round': 0,
            'game_active': True
        }

        await self.notify_game_start(game, player1, player2)
        if not self._countdown_task:
            self._countdown_task = asyncio.create_task(self.run_countdown_sequence())
        #Create task to wait countdown end
        asyncio.create_task(self._launch_game_after_countdown())

    async def _launch_game_after_countdown(self):
        await self._countdown_done.wait()
        # game_loop_task can be launch because countdown is done
        if not self._game_loop_task:
            self._game_loop_task = asyncio.create_task(self.game_loop())

    async def run_countdown_sequence(self):
        for count in range(3, -1, -1):
            await self.notify_countdown(count)
            if count > 0:
                await asyncio.sleep(1)
            elif count == 0:
                await asyncio.sleep(2)
        self._countdown_done.set()

    async def game_loop(self):
        players = await Player.get_players_of_game(self.game_id)
        if players is None:
            print("Error getting players of the game in game_loop")
            return

        # Use an event to manage game state
        game_over_event = asyncio.Event()

        async def monitor_game_state():
            nonlocal players
            while not game_over_event.is_set():
                if players[0].life <= 0 or players[1].life <= 0:
                    game_over_event.set()
                    break
                players = await Player.get_players_of_game(self.game_id)
                await asyncio.sleep(0.5) # Short sleep to prevent tight loop

        async def round_manager():
            while not game_over_event.is_set():
                if not self._start_round_task:
                    self._start_round_task = asyncio.create_task(self.start_round(players))

                # Wait for the next round or game end
                try:
                    await asyncio.wait_for(game_over_event.wait(), timeout=10.0)
                except asyncio.TimeoutError:
                    continue

            # Game ended
            await self.notify_looser(players)

        # Run game monitoring and round management concurrently
        await asyncio.gather(
            monitor_game_state(),
            round_manager()
        )

    async def start_round(self, players):
        self.current_round_count += 1
        await self.notify_round_count(self.current_round_count)

        await asyncio.sleep(3)
        # Create an event to signal round completion
        # self_round_complete_event = asyncio.Event()
        async def wait_for_player_actions():
            # Implement a timeout mechanism for player actions
            try:
                await asyncio.wait_for(
                    self.wait_for_both_players_action(players), #N'arrete pas le timer
                    timeout=20.0
                )
                self._round_complete_event.set()
            except asyncio.TimeoutError:
                # Handle timeout (e.g., default to 'none' action)
                self._round_complete_event.set()

        # Run action waiting concurrently
        await asyncio.gather(
            wait_for_player_actions(),
            self.send_round_timer()  # Method to send timer updates to frontend
        )

        # Check and resolve round
        await self.notify_round_end()
        result, players = await self.check_winner_round()

        if result is not None:
            winner_id, power = await self.apply_power(players[0], players[1], result)
            await self.notify_round_interaction(winner_id, power)
            try:
                await asyncio.wait_for(self._both_anim_done.wait(), timeout=20.0)
            except asyncio.TimeoutError:
                print("Animation completed timeout error")
                self._both_anim_done.set()
            finally:
                await Player.reset_action(self.game_id)
                self._round_complete_event.clear()
                self._both_anim_done.clear()
                self._start_round_task = None
                await asyncio.sleep(0.5)


    async def send_round_timer(self, total_time=20):
        start_time = time.time()
        await self.notify_round_timer(start_time)

        while not self._round_complete_event.is_set():
            elapsed_time = time.time() - start_time
            remaining_time =  max(total_time - elapsed_time, 0)

            if remaining_time <= 0:
                break

            await asyncio.sleep(0.1)

    @staticmethod
    async def wait_for_both_players_action(players):
        while not (players[0].action and players[1].action):
            players = await Player.get_players_of_game(players[0].game_id)
            await asyncio.sleep(0.5)

    async def check_winner_round(self):
        players = await Player.get_players_of_game(self.game_id)
        if players is None:
            print("Error getting players of the game in check_winner_round")
            return
        action_p1 = players[0].action
        action_p2 = players[1].action
        result = self.resolve_power(action_p1, action_p2)
        if result == 'Error interaction':
            print('Error with power interaction')
            return None
        return result, players

    @staticmethod
    def resolve_power(a_p1, a_p2):
        power_interaction_table = {
            ('dark_bolt', 'spark'): 1,
            ('dark_bolt', 'fire_bomb'): 2,
            ('dark_bolt', 'lightning'): 0,
            ('dark_bolt', 'dark_bolt'): 0,
            ('dark_bolt', None): 1,
            (None, 'dark_bolt'): 2,
            ('fire_bomb', 'dark_bolt'): 1,
            ('fire_bomb', 'lightning'): 2,
            ('fire_bomb', 'spark'): 0,
            ('fire_bomb', 'fire_bomb'): 0,
            ('fire_bomb', None): 1,
            (None, 'fire_bomb'): 2,
            ('lightning', 'fire_bomb'): 1,
            ('lightning', 'spark'): 2,
            ('lightning', 'dark_bolt'): 0,
            ('lightning', 'lightning'): 0,
            ('lightning', None): 1,
            (None, 'lightning'): 2,
            ('spark', 'lightning'): 1,
            ('spark', 'dark_bolt'): 2,
            ('spark', 'fire_bomb'): 0,
            ('spark', 'spark'): 0,
            ('spark', None): 1,
            (None, 'spark'): 2,
            (None, None): 0
        }

        return power_interaction_table.get((a_p1, a_p2), "Error interaction")

    @staticmethod
    async def apply_power(p1, p2, result):
        id_winner = 0
        action = None

        if result == 1:
            await p2.lose_life()
            id_winner = p1.player_id
            action = p1.action
        elif result == 2:
            await p1.lose_life()
            id_winner = p2.player_id
            action = p2.action

        return id_winner, action

    @database_sync_to_async
    def get_game_from_cache(self, game_id):
        return cache.get(f'pp_game_{game_id}')

    @database_sync_to_async
    def remove_game_from_cache(self, game_id):
        cache.delete(f'pp_game_{game_id}')

    async def set_game_to_cache(self, game_id, game):
        cache = caches['default']
        await sync_to_async(cache.set)(f'pp_game_{game_id}', game, timeout=60*30)

    async def notify_game_cancel(self, p_id):
        message = {
            'type': 'game_cancel',
            'player_id': p_id, # Mettre le pseudo du joueur ?
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_debug(self, fromwhere):
        message = {
            'type': 'debug',
            'from': fromwhere
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_round_timer(self, start_time):
        message = {
            'type': 'round_timer',
            'start_time': start_time,
            'total_time': 20
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_player_attack(self, player_id):
        message = {
            'type': 'player_attack',
            'player_id': player_id,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_looser(self, players):
        id_looser = players[0].player_id if players[1].life == 0 else players[1].player_id
        message = {
            'type': 'looser',
            'player_id': id_looser
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_round_interaction(self, p_id, power):
        print('send round interaction')
        message = {
            'type': 'round_interaction',
            'player_id': p_id,
            'power': power
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_round_end(self):
        message = {
            'type': 'round_end',
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_round_count(self, count):
        message = {
            'type': 'round_count',
            'count': count,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_countdown(self, countdown):
        message = {
            'type': 'countdown',
            'countdown': countdown,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_player_connected(self):
        print('dans la function')
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

    async def notify_game_start(self, game, player1, player2):
        message = {
            'type': 'game_start',
            'game_id': str(game['game_id']),
            'player1_id': game['player1'],
            'player2_id': game['player2'],
            'player1_name': game['player1_name'],
            'player2_name': game['player2_name'],
            'player1_avatar': game['player1_avatar'],
            'player2_avatar': game['player2_avatar'],
            'player1_life': player1.life,
            'player2_life': player2.life,
        }
        await self.channel_layer.group_send(self.game_group_name, message)

    async def notify_player_ready(self, player_id):
        message = {
            'type': 'player_ready',
            'player_id': player_id,
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

    async def game_cancel(self, event):
        message = {
            'type': 'game_cancel',
            'player_id': event['player_id'],
        }
        await self.send(text_data=json.dumps(message))

    async def debug(self, event):
        message = {
            'type': 'debug',
            'from': event['from']
        }
        await self.send(text_data=json.dumps(message))

    async def round_timer(self, event):
        message = {
            'type': 'round_timer',
            'start_time': event['start_time'],
            'total_time': event['total_time'],
        }
        await self.send(text_data=json.dumps(message))

    async def player_attack(self, event):
        message = {
            'type': 'player_attack',
            'player_id': event['player_id'],
        }
        await self.send(text_data=json.dumps(message))

    async def round_end(self, event):
        message = {
            'type': event['type']
        }
        await self.send(text_data=json.dumps(message))

    async def looser(self, event):
        message = {
            'type': 'looser',
            'player_id': event['player_id'],
        }
        await self.send(text_data=json.dumps(message))

    async def round_interaction(self, event):
        message = {
            'type': 'round_interaction',
            'player_id': event['player_id'],
            'power': event['power'],
        }
        print('send twice messages')
        await self.send(text_data=json.dumps(message))

    async def round_count(self, event):
        message = {
            'type': 'round_count',
            'count': event['count'],
        }
        await self.send(text_data=json.dumps(message))

    async def countdown(self, event):
        message = {
            'type': 'countdown',
            'countdown': event['countdown'],
        }
        await self.send(text_data=json.dumps(message))

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
            'player1_lifes': event['player1_life'],
            'player2_lifes': event['player2_life'],
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
    async def start_countdown(self):
        countdown = 3
        while countdown >= 0:
            await self.notify_countdown(countdown)
            await asyncio.sleep(1)
            countdown -= 1