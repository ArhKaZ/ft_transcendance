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
                'player_number': 2,
                'player_id': player_id,
                'player_name': game['player2_name'],
                'opponent_id': game['player1'],
                'opponent_name': game['player1_name'],
            })
    return JsonResponse({'error': 'Player not found in game'}, status=404)

def get_all_game(request):
    cache = caches['default']
    games = []

    for key in cache.iter_keys('game_*'):
        game = cache.get(key)
        if game:
            games.append({
                'game_id': game['game_id'],
                'status': game['status'],
            })
    return JsonResponse(games, safe=False)

def get_info_game(request):
    game_id = request.GET.get('game_id')
    game = cache.get(f'game_{game_id}')
    if game:
        if game['status'] == 'IN_PROGRESS':
            player1 = cache.get(f'player_{game["player1"]}_{game_id}')
            player2 = cache.get(f'player_{game["player2"]}_{game_id}')
            score = [player1['score'], player2['score']]
            return JsonResponse({
                'game_id': game['game_id'],
                'status': game['status'],
                'player1': game['player1_name'],
                'player2': game['player2_name'],
                'score': score,
            })
        else:
            return JsonResponse({
                'game_id': game['game_id'],
                'status': game['status'],
                'player1': game['player1_name'],
                'player2': game['player2_name'],
                'score': [0, 0]
            })

# @csrf_exempt
# @require_http_methods(['POST'])
# def cli_login(request):
#     data = json.loads(request.body)
#     username =  data.get('username')
#     password = data.get('password')
#     user = authenticate(username=username, password=password)
#     if user is not None:
#         refresh = RefreshToken.for_user(user)
#         return JsonResponse({
#             'refresh': str(refresh),
#             'access': str(refresh.access_token),
#             'user_id': user.id,
#             'username': user.username,
#         })
#     else:
#         return JsonResponse({'error': 'Invalid credentials'}, status=400)
#
# @require_http_methods(['GET'])
# def cli_get_user(request):
#     auth_header = request.META.get('HTTP_AUTHORIZATION')
#     if not auth_header or not auth_header.startswith('Bearer '):
#         return JsonResponse({"error": "No token provided"}, status=403)
#
#     token = auth_header.split(' ')[1]
#     jwt_auth = JWTAuthentication()
#
#     try:
#         validated_token = jwt_auth.get_validated_token(token)
#         user = jwt_auth.get_user(validated_token)
#         return JsonResponse({
#             "id": user.id,
#             "username": user.username,
#             "src_avatar": user.avatar.url if user.avatar else None
#         })
#     except ValidationError as e:
#         return JsonResponse({'error': str(e)}, status=401)
#     except InvalidToken as e:
#         return JsonResponse({'error': "Invalid Token"}, status=401)
#     except MyUser.DoesNotExist:
#         return JsonResponse({'error': "User does not exist"}, status=404)
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=500)
#
# @csrf_exempt
# @require_http_methods(['POST'])
# def cli_create_or_join_game(request):
#     auth_header = request.META.get('HTTP_AUTHORIZATION')
#     if not auth_header or not auth_header.startswith('Bearer '):
#         return JsonResponse({"error": "No token provided"}, status=403)
#
#     token = auth_header.split(' ')[1]
#     jwt_auth = JWTAuthentication()
#
#     try:
#         validated_token = jwt_auth.get_validated_token(token)
#         user = jwt_auth.get_user(validated_token)
#
#         fake_request = HttpRequest()
#         fake_request.method = 'GET'
#         fake_request.GET = request.GET.copy()
#
#         fake_request.GET['player_id'] = str(user.id)
#         fake_request.GET['player_name'] = user.username
#         fake_request.GET['src'] = user.avatar.url if user.avatar else None
#
#         response = create_or_join_game(fake_request)
#         return response
#     except ValidationError as e:
#         return JsonResponse({'error': str(e)}, status=401)
#     except InvalidToken as e:
#         return JsonResponse({'error': "Invalid Token"}, status=401)
#     except MyUser.DoesNotExist:
#         return JsonResponse({'error': "User does not exist"}, status=404)
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=500)