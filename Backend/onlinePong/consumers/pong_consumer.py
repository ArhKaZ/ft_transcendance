from .base_consumer import BaseGameConsumer
from .handlers.game_handlers import GameHandlers
from .handlers.player_handlers import PlayerHandlers
from .handlers.ball_handlers import BallHandlers
from onlinePong.consumers.handlers.message_handlers import MessageHandlers

import asyncio
import json

class PongConsumer(BaseGameConsumer):
    async def connect(self):
        await super().connect()
        self.game_handler = GameHandlers(self)
        self.player_handler = PlayerHandlers(self)
        self.ball_handler = BallHandlers(self)
        self.message_handler = MessageHandlers(self)

        self.listen_task = asyncio.create_task(self._redis_listener())
        await self.notify_player_connected()

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data['action']

        actions = {
            'ready': self.game_handler.handle_player_ready,
            'move': self.player_handler.handle_player_move
        }

        handler = actions.get(action)
        if handler:
            await handler(data)

    async def disconnect(self, close_code):
        print(f"Disconnect player {self.player_id} from game {self.game_id}")
        await self.handle_disconnect()
        await self.cleanup()

    async def cleanup(self):
        if hasattr(self, 'listen_task'):
            self.listen_task.cancel()
        if hasattr(self, 'pubsub'):
            await self.pubsub.unsubscribe(f"game_update:{self.game_id}")
        if hasattr(self, 'redis'):
            await self.redis.close()
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)