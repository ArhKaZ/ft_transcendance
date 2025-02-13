from django.urls import path
from onlinePong.consumer import PongConsumer
from magicDuel.consumer import MagicDuelConsumer

websocket_urlpatterns = [
    path('ws/onlinePong/<str:player_id>/', PongConsumer.as_asgi()),
    path('ws/magicDuel/<str:player_id>/', MagicDuelConsumer.as_asgi()),
]