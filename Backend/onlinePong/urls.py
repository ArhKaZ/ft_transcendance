from django.urls import path, include
from .views import index, create_or_join_game, get_player

urlpatterns = [
    path('', index, name='index'),
    path('api/create_or_join_game', create_or_join_game, name='create_game'),
    path('api/get_player', get_player, name='get_player'),
]