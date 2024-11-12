from .physics import PhysicsEngine


class InputHandler:
    def __init__(self):
        self.physics = PhysicsEngine()
        self.input_actions = {
        'ArrowLeft': self.handle_arrow_left,
        'ArrowRight': self.handle_arrow_right,
        'ArrowUp': self.handle_arrow_up,
        }

    async def handle_arrow_left(self, player):
        self.physics.apply_horizontal_movement(player, -1)
        player.look = 'left'
        await player.save_to_cache()
        return player, 'Run'

    async def handle_arrow_right(self, player):
        self.physics.apply_horizontal_movement(player, 1)
        player.look = 'right'
        await player.save_to_cache()
        return player, 'Run'
        pass

    async def handle_arrow_up(self, player):
        if self.physics.apply_jump(player):
            await player.save_to_cache()
            return player, 'Jump'
        return player, 'Idle'

    async def handler(self, player, key):
        action = self.input_actions.get(key)
        if action:
            return await action(player)
        return None