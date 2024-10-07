from django.urls import path
from . import consumer

websocket_urlpatterns = [
    path('ws/onlinePong/<str:game_id>/<str:current_player_id>', consumer.PongConsumer.as_asgi()),
]