import json
import uuid

from cryptography.hazmat.primitives.twofactor import InvalidToken
from django.core.exceptions import ValidationError
from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import JsonResponse, HttpResponseForbidden, HttpResponseRedirect, HttpRequest
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from api.models import MyUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.cache import cache, caches
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

def index(request):
    return render(request, "./onlinePong/index.html")

def create_or_join_game(request):
    cache = caches['default']
    player_id = request.GET.get('player_id')
    player_username = request.GET.get('player_name')
    player_avatar = request.GET.get('src')

    game = find_waiting_game()
    game_id = None
    p1_is_me = False
    p2_is_me = False

    if not game:
        game_id = uuid.uuid4()
        cache_key = f'game_{game_id}'
        with cache.lock(f'{cache_key}_lock', timeout=30):
            game = {
                'game_id': game_id,
                'player1': player_id,
                'player1_name': player_username,
                'player1_avatar': player_avatar,
                'player2': None,
                'player2_name': None,
                'player2_avatar': None,
                'player1_ready': False,
                'player2_ready': False,
                'status': 'WAITING'
            }
            cache.set(f'game_{game_id}', game, timeout=60 * 30)
        p1_is_me = True
    elif game['player1'] == player_id:
        game_id = game['game_id']
        p1_is_me = True
    elif game['player2'] == player_id:
        game_id = game['game_id']
        p2_is_me = True
    elif game['player2'] is None:
        game_id = game['game_id']
        cache_key = f'game_{game_id}'
        with cache.lock(f'{cache_key}_lock', timeout=30):
            game['player2'] = player_id
            game['player2_name'] = player_username
            game['player2_avatar'] = player_avatar
            game['status'] = 'WAITING_READY'
            cache.set(f'game_{game_id}', game, timeout=60 * 30)
        p2_is_me = True

    return JsonResponse({
        'game_id': game_id,
        'status': game['status'],
        'player1': game['player1'],
        'player1_name': game['player1_name'],
        'player1_avatar': game['player1_avatar'],
        'player1_is_me': p1_is_me,
        'player2': game['player2'],
        'player2_name': game['player2_name'],
        'player2_avatar': game['player2_avatar'],
        'player2_is_me': p2_is_me,
        'player1_ready': game['player1_ready'],
        'player2_ready': game['player2_ready']
    })

def find_waiting_game():
    cache = caches['default']
    for key in cache.iter_keys('game_*'):
        game = cache.get(key)
        if game and game['status'] == 'WAITING' and game['player2'] is None:
            return game
    return None


def get_player(request):
    game_id = request.GET.get('game_id')
    player_id = request.GET.get('player_id')

    game = cache.get(f'game_pong_{game_id}')
    if game:
        if game['p1_id'] == player_id:
            return JsonResponse({
                'player_number': 1,
                'player_id': player_id,
                'player_name': game['p1_username'],
                'opponent_id': game['p2_id'],
                'opponent_name': game['p2_username'],
            })
        elif game['p2_id'] == player_id:
            return JsonResponse({
                'player_number': 2,
                'player_id': player_id,
                'player_name': game['p2_username'],
                'opponent_id': game['p1_id'],
                'opponent_name': game['p1_username'],
            })
    return JsonResponse({'error': 'Player not found in game'}, status=404)

def get_all_game(request):
    cache = caches['default']
    games = []

    for key in cache.iter_keys('game_pong_*'):
        game = cache.get(key)
        if game:
            games.append({
                'game_id': game['game_id'],
                'status': game['status'],
            })
    return JsonResponse(games, safe=False)

def get_info_game(request):
    game_id = request.GET.get('game_id')
    game = cache.get(f'game_pong_{game_id}')
    if game:
        if game['status'] == 'IN_PROGRESS':
            player1 = cache.get(f'player_{game["player1"]}_{game_id}')
            player2 = cache.get(f'player_{game["player2"]}_{game_id}')
            score = [player1['score'], player2['score']]
            return JsonResponse({
                'game_id': game['id'],
                'status': game['status'],
                'player1': game['p1_username'],
                'player2': game['p2_username'],
                'score': score,
            })
        else:
            return JsonResponse({
                'game_id': game['id'],
                'status': game['status'],
                'player1': game['p1_username'],
                'player2': game['p2_username'],
                'score': [0, 0]
            })
