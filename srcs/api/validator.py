from django.core.exceptions import ValidationError

class MaxFileSizeValidator:
    def __init__(self, max_size):
        self.max_size = max_size

    def __call__(self, value):
        if value and value.size > self.max_size:
            raise ValidationError(f'File size exceeds {self.max_size // 1024 // 1024}MB.')