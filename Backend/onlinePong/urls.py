from django.urls import path, include
from .views import index, create_or_join_game, get_player, cli_create_or_join_game, cli_get_user, cli_login, get_all_game, get_info_game

urlpatterns = [
    path('', index, name='index'),
    path('api/create_or_join_game', create_or_join_game, name='create_game'),
    path('api/get_player', get_player, name='get_player'),
    # path('api/cli/create_or_join_game', cli_create_or_join_game, name='cli_create_or_join_game'),
    # path('api/cli/get_player', cli_get_user, name='cli_get_user'),  # We can use the existing get_player view directly
    # path('api/cli/login', cli_login, name='cli_login'),
    path('api/cli/get_all_game', get_all_game, name='get_all_game'),
    path('api/cli/get_info_game', get_info_game, name='get_info_game'),
]