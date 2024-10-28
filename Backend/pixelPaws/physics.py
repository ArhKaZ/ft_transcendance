class Physics:
    def __init__(self):
        self.knockback_scaling = 0.1
        self.base_knockback = 5
        self.gravityAccumulator = 0

    def handle_move(self, player_id, inputs):
        print(type(inputs['ArrowLeft']))