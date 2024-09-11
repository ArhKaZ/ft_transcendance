import uuid

from django.core.cache import cache
from django.http import (HttpResponse, JsonResponse)
from django.shortcuts import render

# Create your views here.
def index(request):
    return render(request, "./index.html")

def create_or_join_game(request):
    session_id = request.GET.get('session_id')
    game = find_waiting_game()
    game_id = None
    if not game:
        game_id = uuid.uuid4()
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
        game['player2'] = session_id
        game['status'] = 'WAITING_READY'
        cache.set(f'game_{game_id}', game, timeout= 60*30)

    return JsonResponse({
        'game_id': game_id,
        'status': game['status'],
        'player1': game['player1'],
        'player2': game['player2'],
        'player1_ready': game['player1_ready'],
        'player2_ready': game['player2_ready'],
    })

def find_waiting_game():
    for key in cache.iter_keys('game_*'):
        game = cache.get(key)
        if game and game['status'] == 'WAITING':
            return game
    return None


def get_player(request):
    print('ici')
    for key in cache.iter_keys('game_*'):
        game = cache.get(key)
        print("key (repr):", repr(game['game_id']))
        print("request (repr):", repr(request.GET.get('game_id')))
        print(game['game_id'] == request.GET.get('game_id'))
        if game and str(game['game_id']) == request.GET.get('game_id'):
            print("je passe ici")
            if game['player1'] == request.GET.get('session_id'):
                print('player1')
                return JsonResponse({
                    'nb_player': 1,
                })
            elif game['player2'] == request.GET.get('session_id'):
                print('player2')
                return JsonResponse({
                    'nb_player': 2,
                })
            else:
                return None