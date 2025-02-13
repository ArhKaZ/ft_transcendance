from django.urls import path, include
from requests import delete

from .views import index, get_all_game, get_info_game

urlpatterns = [
    path('', index, name='index'),
    path('api/cli/get_all_game', get_all_game, name='get_all_game'),
    path('api/cli/get_info_game', get_info_game, name='get_info_game'),
]