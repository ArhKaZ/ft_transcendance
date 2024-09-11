from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
import json

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.game_group_name = f'game_{self.game_id}'

        self.game = await self.get_game_from_cache(self.game_id)

        if not self.game:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )

        await self.accept()


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json['action']

        if action == 'ready':
            await self.set_player_ready(self.session_id)
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_message',
                    'message': f'{self.session_id} is ready'
                }
            )
            await self.check_both_ready()


    async def game_message(self, event):
        message = event['message']

        await self.send(text_data=json.dumps({
            'message': message
        }))

    @database_sync_to_async
    def get_game_from_cache(self, game_id):
        return cache.get(f'game_{game_id}')

    @database_sync_to_async
    def set_player_ready(self, session_id):
        game = cache.get(f'game_{self.game_id}')

        if not game:
            return

        if game['player1'] == session_id:
            game['player1_ready'] = True
        elif game['player2'] == session_id:
            game['player2_ready'] = True
        cache.set(f'game_{self.game_id}', game, timeout=60*30)

    async def check_both_ready(self):
        game = await self.get_game_from_cache(self.game_id)
        print("p1 ready :", game.get('player1_ready'))
        print("p2 ready : ", game.get('player2_ready'))
        if game.get('player1_ready') and game.get('player2_ready'):
            game['status'] = 'IN_PROGRESS'
            cache.set(f'game_{self.game_id}', game, timeout=60*30)

            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_message',
                    'message': 'game_start'
                }
            )