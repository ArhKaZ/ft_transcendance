from onlinePong.player import Player

class PlayerHandlers:
    def __init__(self, consumer):
        self.consumer = consumer

    async def handle_player_move(self, data):
        player = await self.get_or_create_player(data['player_id'])
        player.move(data['direction'])
        await player.save_to_cache()
        await self.broadcast_player_move(player)

    async def get_or_create_player(self, player_id):
        player_state = await Player.load_from_cache(player_id, self.consumer.game_id)
        if player_state:
            player = Player(player_id, self.consumer.game_id)
            player.y = player_state['y']
            player.score = player_state['score']
        else:
            player = Player(player_id, self.consumer.game_id)
        return player

    async def broadcast_player_move(self, player):
        message = {
            'type': 'player_move',
            'event': 'player_move',
            'y': player.y,
            'player_id': player.player_id
        }
        await self.consumer.channel_layer.group_send(self.consumer.game_group_name, message)
        await self.consumer.publish_to_redis(message)