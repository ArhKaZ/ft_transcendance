from onlinePong.player import Player

import asyncio

class MessageHandlers:
    def __init__(self, consumer):
        self.consumer = consumer

    async def _redis_listener(self):
        try:
            async for message in self.consumer.pubsub.listen():
                if message['type'] == 'message':
                    await self.handle_redis_message(message['data'])
        except asyncio.CancelledError:
            pass

    async def handle_redis_message(self, data):
        if data == b"score_updated":
            await self.handle_score_update()
        elif data.startswith(b"game_finish_"):
            await self.handle_game_finish(data)

    async def handle_score_update(self):
        players = await Player.get_players_of_game(self.consumer.game_id)
        scores = [players[0].score, players[1].score]
        await self.send_score_update(scores)

    async def handle_game_finish(self, data):
        winning_session = data.decode().split('_')[-1]
        if hasattr(self.consumer, 'send_ball_task'):
            self.consumer.send_ball_task.cancel()

        game = await self.consumer.get_game_from_cache(self.consumer.game_id)
        game['status'] = 'FINISHED'
        await self.consumer.set_game_to_cache(self.consumer.game_id, game)

        await self.send_game_finish(winning_session)
        await self.consumer.cleanup()