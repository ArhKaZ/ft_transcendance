import uuid
import asyncio
import aioredis
import json

from typing import Dict, List, Optional
from django.conf import settings
from django.core.cache import cache
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from .game import PongGame

class PongServer:
	_instance = None
	_lock = asyncio.Lock()
	_initialized = False

	def __new__(cls):
		if not cls._instance:
			cls._instance = super().__new__(cls)
		return cls._instance

	def __init__(self):
		if not self._initialized:
			self.games = {}
			self.waiting_players = []
			self.active_connections = {}
			self._initialized = True

	async def initialize(self):
		if not hasattr(self, '_init_done'):
			async with self._lock:
				if not hasattr(self, '_init_done'):
					await self._restore_state()
					self._init_done = True

	async def _restore_state(self):
		active_games = await sync_to_async(cache.get)('active_pong_games') or []
		for game_id in active_games:
			game_data = await sync_to_async(cache.get)(f'pong_game_{game_id}')
			if game_data:
				game = await PongGame.create_from_cache(game_data)
				self.games[game_id] = game

		self.waiting_players = await sync_to_async(cache.get)('waiting_onlinePong_players') or []

	async def register_connection(self, player_id: int, channel_name: str):
		await self.initialize()
		self.active_connections[player_id] = channel_name
		await sync_to_async(cache.set)(f"player_{player_id}_channel", channel_name)

	async def initialize_game(self, player_info, opp_info = None):
		await self.initialize()
		async with self._lock:
			if opp_info is None:
				opp_info = await self.find_opponent(player_info)
				if not opp_info:
					await self.add_to_waiting_list(player_info)
					return None, None

		game_id = str(uuid.uuid4())
		game = PongGame(player_info, opp_info, game_id)
		self.games[game_id] = game

		active_games = await sync_to_async(cache.get)('active_pong_games') or []
		active_games.append(game_id)
		await sync_to_async(cache.set)('active_pong_games', active_games)

		for player in [player_info, opp_info]:
			await sync_to_async(cache.set)(
				f"player_current_game_{player['id']}",
				game_id,
				timeout=1800
			)
		await game.save_to_cache()
		await self.notify_opponent(opp_info, game_id)
		return game, game_id

	async def notify_opponent(self, opp_info, game_id):
		channel_name = self.active_connections.get(opp_info["id"])
		if channel_name:
			channel_layer = get_channel_layer()
			await channel_layer.send(channel_name, {
				'type': 'handle_find_game_message',
				'game_id': game_id
			})

	async def find_opponent(self, player_info):
		await self.initialize()
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
		if current_waiting_players:
			current_waiting_players = [p for p in current_waiting_players if p['id'] != player_id]
		await sync_to_async(cache.set)(key, current_waiting_players)

	async def cleanup_player(self, player_id: int, username: str, game_id: str):
		await self.initialize()
		async with self._lock:
			if game_id in self.games:
				game = self.games[game_id]
				await game.cancel_game(player_id, username)

				if game.is_empty():
					del self.games[game_id]
					active_games = await sync_to_async(cache.get)('active_pong_games') or []
					active_games.remove(game_id)
					await sync_to_async(cache.set)('active_pong_games', active_games)

			await sync_to_async(cache.delete)(f'player_current_game_{player_id}')
			await sync_to_async(cache.delete)(f"player_{player_id}_channel")
			self.active_connections.pop(player_id, None)
			await self.remove_player_from_waiting(player_id)

pong_server = PongServer()