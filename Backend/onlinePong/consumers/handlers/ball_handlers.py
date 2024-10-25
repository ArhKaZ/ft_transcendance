import asyncio
from onlinePong.ball import Ball
from onlinePong.player import Player

class BallHandlers:
    def __init__(self, consumer):
        self.consumer = consumer

    async def send_ball_position(self):
        while True:
            try:
                ball = await self.get_or_create_ball()
                await ball.update_position()
                await ball.save_to_cache()
                await self.broadcast_ball_position(ball)
            except asyncio.CancelledError:
                print('Task cancelled')
                break
            except Exception as e:
                print(f'Error in send_ball_position with game:{self.consumer.game_id}: {e}')
            finally:
                await asyncio.sleep(0.02)

    async def get_or_create_ball(self):
        ball_state = await Ball.load_from_cache(self.consumer.game_id)
        players = await Player.get_players_of_game(self.consumer.game_id)

        if not ball_state:
            return Ball(self.consumer.game_id, players[0], players[1])

        ball = Ball(self.consumer.game_id, players[0], players[1])
        ball.x, ball.y, ball.vx, ball.vy = ball_state['x'], ball_state['y'], ball_state['vx'], ball_state['vy']
        return ball

    async def broadcast_ball_position(self, ball):
        message = {
            'type': 'ball_position',
            'event': 'ball_position',
            'x': ball.x,
            'y': ball.y,
            'message': 'ball_position_send'
        }
        await self.consumer.channel_layer.group_send(self.consumer.game_group_name, message)
        await self.consumer.publish_to_redis(message)