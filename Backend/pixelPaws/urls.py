from django.urls import path

from .views import index, create_or_join_game, get_info_player

urlpatterns = [
    path('api/get_info_player/', get_info_player, name='get_player'),
    path('', index, name='index'),
    path('api/create_or_join_game/', create_or_join_game, name='create_or_join_game'),
]