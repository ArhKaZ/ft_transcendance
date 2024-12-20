from django.http import JsonResponse
from django.shortcuts import render
from django.core.cache import caches, cache
from django.views.decorators.csrf import csrf_exempt

import uuid
import json

from django.views.decorators.http import require_GET


# Create your views here.

def index(request):
    return render(request, './magicDuel/index.html')

@csrf_exempt
def create_or_join_game(request):
    if request.method == 'POST':
        try:
            body_unicode = request.body.decode('utf-8')
            body_data = json.loads(body_unicode)

            player_id = body_data.get('player_id')
            username = body_data.get('username')
            avatar = body_data.get('avatar')

            game_state = get_a_game_for_player(player_id, username, avatar)

            return JsonResponse(game_state, status=200)

        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
    else:
        return JsonResponse({'error': 'Only POST request is allowed'}, status=405)

def get_a_game_for_player(player_id, username, avatar):
    cache = caches['default']
    game = find_a_game()
    game_id = None
    p1_is_me = False
    p2_is_me = False

    if not game:
        game_id = uuid.uuid4()
        cache_key = f'pp_game_{game_id}'
        with cache.lock(f'{cache_key}_lock', timeout=60):
            game = {
                'game_id': game_id,
                'player1': player_id,
                'player1_name': username,
                'player1_avatar': avatar,
                'player2': None,
                'player2_name': None,
                'player2_avatar': None,
                'player1_ready': False,
                'player2_ready': False,
                'status': 'WAITING'
            }
            cache.set(f'pp_game_{game_id}', game, timeout=60 * 30)
        p1_is_me = True
    elif game['player1'] == player_id:
        game_id = game['game_id']
        p1_is_me = True
    elif game['player2'] == player_id:
        game_id = game['game_id']
        p2_is_me = True
    elif game['player2'] is None:
        game_id = game['game_id']
        cache_key = f'pp_game_{game_id}'
        with cache.lock(f'{cache_key}_lock', timeout=60):
            game['player2'] = player_id
            game['player2_name'] = username
            game['player2_avatar'] = avatar
            game['status'] = 'WAITING_READY'
            cache.set(f'pp_game_{game_id}', game, timeout=60 * 30)
        p2_is_me = True

    game_state = {
        'game': game,
        'p1_is_me': p1_is_me,
        'p2_is_me': p2_is_me,
    }
    return game_state

def find_a_game():
    cache = caches['default']
    for key in cache.iter_keys('pp_game_*'):
        game = cache.get(key)
        if game and game['status'] == 'WAITING' and game['player2'] is None:
            return game
    return None


def get_info_player(request):
    game_id = request.GET.get('game_id')
    player_id = request.GET.get('player_id')

    game = cache.get(f'wizard_duel_game_{game_id}')
    if game:
        if str(game['p1_id']) == player_id:
            return JsonResponse({
                'player_number': 1,
                'player_id': player_id,
                'player_name': game['p1_username'],
                'opponent_id': game['p2_id'],
                'opponent_name': game['p2_username'],
            })
        elif str(game['p2_id']) == player_id:
            return JsonResponse({
                'player_number': 2,
                'player_id': player_id,
                'player_name': game['p2_username'],
                'opponent_id': game['p1_id'],
                'opponent_name': game['p1_username'],
            })
    return JsonResponse({'error': 'Player not found in the game'}, status=404)