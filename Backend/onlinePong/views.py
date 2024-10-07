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
    player_id = request.GET.get('player_id')
    player_username = request.GET.get('player_username')
    game = find_waiting_game()
    print(game)
    game_id = None
    if not game:
        game_id = uuid.uuid4()
        cache_key = f'game_{game_id}'

        with cache.lock(f'{cache_key}_lock', timeout=30):
            game = {
                'game_id': game_id,
                'player1': player_id,
                'player1_name': player_username,
                'player2': None,
                'player2_name': None,
                'player1_ready': False,
                'player2_ready': False,
                'status': 'WAITING'
            }
            cache.set(f'game_{game_id}', game, timeout=60 * 30)

    elif game['player1'] == player_id:
        game_id = game['game_id']

    elif game['player1'] != player_id and game['player2'] is None:
        game_id = game['game_id']
        cache_key = f'game_{game_id}'

        with cache.lock(f'{cache_key}_lock', timeout=30):
            game['player2'] = player_id
            game['player2_name'] = player_username
            game['status'] = 'WAITING_READY'
            cache.set(f'game_{game_id}', game, timeout= 60*30)

    return JsonResponse({
        'game_id': game_id,
        'status': game['status'],
        'player1': game['player1'],
        'player1_name': game['player1_name'],
        'player2': game['player2'],
        'player2_name': game['player2_name'],
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
    game_id = request.GET.get('game_id')
    player_id = request.GET.get('player_id')

    game = cache.get(f'game_{game_id}')
    if game:
        if game['player1'] == player_id:
            return JsonResponse({
                'player_number': 1,
                'player_id': player_id,
                'player_name': game['player1_name'],
                'opponent_id': game['player2'],
                'opponent_name': game['player2_name'],
            })
        elif game['player2'] == player_id:
            return JsonResponse({
                'nb_player': 2,
                'player_id': player_id,
                'player_name': game['player2_name'],
                'opponent_id': game['player1'],
                'opponent_name': game['player1_name'],
            })
    return JsonResponse({'error': 'Player not found in game'}, status=404)