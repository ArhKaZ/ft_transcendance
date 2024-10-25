from django.urls import path
from onlinePong.consumer import PongConsumer
from pixelPaws.consumer import PixelPawsConsumer

websocket_urlpatterns = [
    path('ws/onlinePong/<str:game_id>/<str:current_player_id>/', PongConsumer.as_asgi()),
    path('ws/pixelPaws/<str:game_id>/<str:current_player_id>/', PixelPawsConsumer.as_asgi()),
]