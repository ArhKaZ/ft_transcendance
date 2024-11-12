class PhysicsEngine:
    def __init__(self):
        self.gravity = 0.5
        self.terminal_velocity = 10
        self.jump_force = -2
        self.double_jump_force = -2
        self.ground_speed = 0.1
        self.air_speed = 0.07
        self.max_horizontal_speed = 8

    def apply_horizontal_movement(self, player, direction):
        #diff vitesse sol et air
        current_speed = self.ground_speed if player.is_on_ground else self.air_speed

        #apply movement
        player.velocity_x += direction * current_speed

        # speed limit
        player.velocity_x = max(min(player.velocity_x, self.max_horizontal_speed),
                                -self.max_horizontal_speed)

    def apply_jump(self, player):
        if player.is_on_ground:
            print('player on ground')
            player.velocity_y += self.jump_force
            player.is_on_ground = False
            player.is_jumping = True
            return True
        elif player.has_double_jump:
            print('player djump')
            player.velocity_y += self.double_jump_force
            player.has_double_jump = False
            return True
        return False