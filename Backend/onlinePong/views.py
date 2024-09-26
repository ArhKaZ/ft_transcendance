import uuid
from .ball import Ball

from django.core.cache import cache, caches
from django.http import (HttpResponse, JsonResponse)
from django.shortcuts import render

# Create your views here.
def index(request):
    return render(request, "./index.html")

def create_or_join_game(request):
    cache = caches['default']
    session_id = request.GET.get('session_id')
    game = find_waiting_game()
    game_id = None
    if not game:
        game_id = uuid.uuid4()
        cache_key = f'game_{game_id}'

        with cache.lock(f'{cache_key}_lock', timeout=30):
            game = {
                'game_id': game_id,
                'player1': session_id,
                'player2': None,
                'player1_ready': False,
                'player2_ready': False,
                'status': 'WAITING'
            }
            cache.set(f'game_{game_id}', game, timeout=60 * 30)

    elif game['player1'] != session_id and game['player2'] is None:
        game_id = game['game_id']
        cache_key = f'game_{game_id}'

        with cache.lock(f'{cache_key}_lock', timeout=30):
            game['player2'] = session_id
            game['status'] = 'WAITING_READY'
            cache.set(f'game_{game_id}', game, timeout= 60*30)

    return JsonResponse({
        'game_id': game_id,
        'status': game['status'],
        'player1': game['player1'],
        'player2': game['player2'],
        'player1_ready': game['player1_ready'],
        'player2_ready': game['player2_ready']
    })

def find_waiting_game():
    for key in cache.iter_keys('game_*'):
        game = cache.get(key)

        if game and game['status'] == 'WAITING':
            return game
    return None


def get_player(request):
    for key in cache.iter_keys('game_*'):
        game = cache.get(key)

        if game and str(game['game_id']) == request.GET.get('game_id'):
            if game['player1'] == request.GET.get('session_id'):
                return JsonResponse({
                    'nb_player': 1,
                })
            elif game['player2'] == request.GET.get('session_id'):
                return JsonResponse({
                    'nb_player': 2,
                })
            else:
                return None