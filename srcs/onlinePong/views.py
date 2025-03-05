import json
import uuid

from cryptography.hazmat.primitives.twofactor import InvalidToken
from django.core.exceptions import ValidationError
from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import JsonResponse, HttpResponseForbidden, HttpResponseRedirect, HttpRequest
from rest_framework.authtoken.models import Token
# from rest_framework_simplejwt.authentication import JWTAuthentication
# from rest_framework_simplejwt.exceptions import InvalidToken
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from api.models import MyUser
# from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.cache import cache, caches
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

def index(request):
    return render(request, "./onlinePong/index.html")


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
