import uuid
import asyncio
import aioredis
import json

from django.conf import settings
from django.core.cache import cache
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from .game import PongGame

class PongServer:
    def __init__(self):
        self.games = {}
        self.waiting_players = []

    async def initialize_game(self, player_info, opp_info = None):
        if opp_info is None:
            print(f'find opp {player_info}')
            opp_info = await self.find_opponent(player_info)
            if not opp_info:
                await self.add_to_waiting_list(player_info)
                return None, None

        game_id = str(uuid.uuid4())
        game = PongGame(player_info, opp_info, game_id)
        self.games[game_id] = game

        await sync_to_async(cache.set)(f'player_current_game_{player_info["id"]}', game_id, timeout=1800)
        await sync_to_async(cache.set)(f'player_current_game_{opp_info["id"]}', game_id, timeout= 1800)
        await game.save_to_cache()

        opponent_channel = await sync_to_async(cache.get)(f"player_{opp_info['id']}_channel")
        if opponent_channel:
            channel_layer = get_channel_layer()
            game_group = f"game_pong_{game_id}"
            # await channel_layer.group_add(game_group, opponent_channel)  
            await channel_layer.send(opponent_channel, {
                'type': 'handle_find_game_message',
                'game_id': game_id
            })

        return game, game_id

    async def find_opponent(self, player_info):
        current_waiting_players = await sync_to_async(cache.get)('waiting_onlinePong_players') or []
        filtered_players = [p for p in current_waiting_players if p['id'] != player_info['id']]

        if filtered_players:
            opponent = filtered_players.pop(0)
            await sync_to_async(cache.set)('waiting_onlinePong_players', filtered_players)
            return opponent
        return None

    async def add_to_waiting_list(self, player_info):
        key = 'waiting_onlinePong_players'
        current_waiting_players = await sync_to_async(cache.get)(key) or []

        if not any(player['id'] == player_info['id'] for player in current_waiting_players):
            current_waiting_players.append(player_info)
            await sync_to_async(cache.set)(key, current_waiting_players)

    async def get_game(self, game_id):
        print(f'get_game : {game_id} {game_id in self.games}')
        if game_id in self.games:
            print(f"{game_id} in games")
            return self.games[game_id]

        game_data = await sync_to_async(cache.get)(f"game_pong_{game_id}")
        if game_data:
            return await PongGame.create_from_cache(game_data)
        return None

    async def remove_player_from_waiting(self, player_id):
        key = 'waiting_onlinePong_players'
        current_waiting_players = await sync_to_async(cache.get)(key) or []
        current_waiting_players = [p for p in current_waiting_player if p['id'] != player_id]
        await sync_to_async(cache.set)(key, current_waiting_players)

    async def cleanup_player(self, player_id, game_id):
        if game_id in self.games:
            game = self.games[game_id]
            await game.handle_player_disconnect(player_id)
            if game.is_empty():
                del self.games[game_id]

        await sync_to_async(cache.delete)(f'player_current_game_{player_id}')
        await sync_to_async(cache.delete)(f"player_{player_id}_channel")
        await self.remove_player_from_waiting(player_id)