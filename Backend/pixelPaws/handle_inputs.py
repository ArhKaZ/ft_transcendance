from .player import Player

async def handle_arrow_left(player):
    print('in fx : x_b', player.x)
    player.x -= player.speed
    print('in gx : x_a', player.x)
    player.look = 'left'
    await player.save_to_cache()
    return player, 'Run'

async def handle_arrow_right(player):
    player.x += player.speed
    player.look = 'right'
    await player.save_to_cache()
    return player, 'Run'
    pass

async def handle_arrow_up(player):
    player.y -= player.speed * 3
    await player.save_to_cache()
    return player, 'Jump'

input_actions = {
    'ArrowLeft': handle_arrow_left,
    'ArrowRight': handle_arrow_right,
    'ArrowUp': handle_arrow_up,
}

async def handler(player, key):
    action = input_actions.get(key)
    if action:
        return await action(player)