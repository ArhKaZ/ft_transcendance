from django.urls import path, include
from requests import delete

from .views import index, create_or_join_game, get_player, get_all_game, get_info_game

urlpatterns = [
    path('', index, name='index'),
    path('api/create_or_join_game', create_or_join_game, name='create_game'),
    path('api/get_player/', get_player, name='get_player'),
    path('api/cli/get_all_game', get_all_game, name='get_all_game'),
    path('api/cli/get_info_game', get_info_game, name='get_info_game'),
]