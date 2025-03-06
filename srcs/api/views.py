from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import render, redirect
from .serializers import UserSerializer
from rest_framework import status
from .models import MyUser, MatchHistory
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.urls import reverse
from django.http import HttpResponseRedirect
# from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from .serializers import MatchHistorySerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Q
from .serializers import UserInfoSerializer, TournamentMatchSerializer, SafePseudoValidator, StrongPasswordValidator
from django.core.exceptions import ValidationError
from .models import Tournament, TournamentMatch
from .blockchain_storage import record_match
import bleach
import re
import os
from .models import AccessToken, RefreshToken
from django.utils import timezone
from django.conf import settings
import base64
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from api.serializers import UserInfoSerializer
from rest_framework import serializers


from requests.exceptions import HTTPError, RequestException
import traceback
import sys
import requests
from PIL import Image
from io import BytesIO
import magic  


ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 5 * 1024 * 1024  


@api_view(['POST'])
@permission_classes([AllowAny])
def add_user(request):
    try:
        data = request.data.copy()
        avatar = request.FILES.get('avatar')
        if avatar:
            ext = os.path.splitext(avatar.name)[1].lower()
            mime_type = magic.Magic(mime=True).from_buffer(avatar.read(1024))
            avatar.seek(0)

            if ext not in ALLOWED_EXTENSIONS or not mime_type.startswith('image/'):
                return Response({'error': 'Format de fichier non autorisé'}, status=status.HTTP_400_BAD_REQUEST)

            if avatar.size > MAX_FILE_SIZE:
                return Response({'error': 'Fichier trop volumineux'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                img = Image.open(avatar)
                img.verify()
                img = Image.open(avatar)
                img.thumbnail((200, 200))
                buffer = BytesIO()
                img.save(buffer, format='PNG')
                data['avatar'] = base64.b64encode(buffer.getvalue()).decode('utf-8')
            except Exception as e:
                return Response({'error': 'Invalid image file'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(serializer.validated_data['password'])
            user.save()
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error: {e}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_online(request, username):
	try:
		user = MyUser.objects.get(username=username)
		
		
		valid_token = AccessToken.objects.filter(
			user=user,
			expires_at__gt=timezone.now()
		).order_by('-created').first()  
		
		is_online = valid_token is not None
		
		return Response({
			'username': username,
			'is_online': is_online,
			'last_active': valid_token.expires_at if is_online else None
		})
		
	except MyUser.DoesNotExist:
		return Response({'error': 'User not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_avatar(request, user_id):
	user = MyUser.objects.get(id=user_id)
	if user.avatar:
		return HttpResponse(user.avatar, content_type='image/png')  # Adjust MIME type
	else:
		return HttpResponseRedirect(settings.DEFAULT_AVATAR_URL)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
	username = request.data.get('username')
	password = request.data.get('password')
	user = authenticate(username=username, password=password)
	
	if user:
		
		AccessToken.objects.filter(user=user).delete()
		RefreshToken.objects.filter(user=user).delete()
		
		
		refresh_token = RefreshToken.objects.create(user=user)
		access_token = AccessToken.objects.create(
			user=user, 
			refresh_token=refresh_token
		)
		
		return Response({
			'access_token': access_token.token,
			'access_expires': access_token.expires_at,
			'refresh_token': refresh_token.token,
			'refresh_expires': refresh_token.expires_at
		})
	return Response({'error': 'Invalid credentials'}, status=401)

@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
	try:
		refresh_token = request.data.get('refresh_token')
		if not refresh_token:
			return Response({'error': 'Refresh token required'}, status=400)

		
		refresh_token_obj = RefreshToken.objects.get(token=refresh_token)
		
		
		AccessToken.objects.filter(user=refresh_token_obj.user).delete()  
		
		
		new_access = AccessToken.objects.create(
			user=refresh_token_obj.user,
			refresh_token=refresh_token_obj
		)
		
		return Response({
			'access_token': new_access.token,
			'access_expires': new_access.expires_at
		})
		
	except RefreshToken.DoesNotExist:
		return Response({'error': 'Invalid refresh token'}, status=401)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_lp(request):
	if request.data['won']:
		request.user.ligue_points += 15
	else:
		request.user.ligue_points -= 15
	request.user.save()
	return Response(request.user.ligue_points)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_history(request):
	matches = MatchHistory.objects.filter(user=request.user)
	serializer = MatchHistorySerializer(matches, many=True)
	return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_info(request):
	user = request.user
	serializer = UserInfoSerializer(user)

	if user:
		user_data = serializer.data

		# Vérifier si l'avatar est stocké en binaire (BYTEA)
		if user.avatar:  # S'assure qu'il y a bien un avatar
			try:
				avatar_base64 = base64.b64encode(user.avatar).decode('utf-8')
				user_data['avatar'] = f"data:image/png;base64,{avatar_base64}"
			except Exception as e:
				return Response({'error': f'Error encoding avatar: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

		return Response(user_data)
	else:
		return Response({'error': 'User not found or not connected'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
	try:
		
		AccessToken.objects.filter(user=request.user).delete()
		
		RefreshToken.objects.filter(user=request.user).delete()
		
		return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
		
	except Exception as e:
		return Response(
			{'error': 'Logout failed'},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def edit_user_api(request):
    user = request.user
    data = {}

    if request.data.get('password'):
        if user.is_oauth == True:
            return Response({'error': 'OAuth users are not allowed to change their password'}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data['password']
        try:
            StrongPasswordValidator()(password)
        except serializers.ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

    if request.data.get('description'):
        cleaned_description = bleach.clean(request.data['description'], strip=True)
        if len(cleaned_description) > 500:
            return Response({'error': 'Description cannot exceed 500 characters'}, status=status.HTTP_400_BAD_REQUEST)
        data['description'] = cleaned_description

    if request.data.get('pseudo'):
        pseudo = request.data['pseudo']
        try:
            SafePseudoValidator()(pseudo)
        except serializers.ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if len(pseudo) < 2 or len(pseudo) > 20:
            return Response({'error': 'Pseudo must be between 2 and 20 characters'}, status=status.HTTP_400_BAD_REQUEST)

        data['pseudo'] = pseudo

    if request.FILES.get('avatar'):
        if user.is_oauth == True:
            return Response({'error': 'OAuth users are not allowed to change their avatar'}, status=status.HTTP_400_BAD_REQUEST)
        
        avatar = request.FILES['avatar']
        ext = os.path.splitext(avatar.name)[1].lower()
        mime_type = magic.Magic(mime=True).from_buffer(avatar.read(1024))
        avatar.seek(0)

        if ext not in ALLOWED_EXTENSIONS or not mime_type.startswith('image/'):
            return Response({'error': 'Format de fichier non autorisé'}, status=status.HTTP_400_BAD_REQUEST)

        if avatar.size > MAX_FILE_SIZE:
            return Response({'error': 'Fichier trop volumineux'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            img = Image.open(avatar)
            img.verify()
            img = Image.open(avatar)
            img.thumbnail((200, 200))
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            data['avatar'] = base64.b64encode(buffer.getvalue()).decode('utf-8')
        except Exception as e:
            return Response({'error': 'Invalid image file'}, status=status.HTTP_400_BAD_REQUEST)

    if data:
        serializer = UserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User updated successfully'}, status=status.HTTP_200_OK)
        return Response({'message': 'Invalid data provided', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    if not data and not request.data.get('password'):
        return Response({'message': 'No changes were made'}, status=status.HTTP_200_OK)

    return Response({'message': 'User updated successfully'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_friends(request):
	pending_friends = request.user.pending_friends.all()
	serializer = UserInfoSerializer(pending_friends, many=True)
	return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friends(request):
	friends = request.user.friends.all()
	serializer = UserInfoSerializer(friends, many=True)
	return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_friend(request):
	try:
		potential_friend = MyUser.objects.get(username=request.data['friend_name'])

		if potential_friend == request.user:
			return Response(
				{'error': 'You cannot add yourself as a friend'},
				status=status.HTTP_400_BAD_REQUEST
			)

		
		if potential_friend in request.user.friends.all():
			return Response(
				{'error': 'You are already friends with this user'},
				status=status.HTTP_400_BAD_REQUEST
			)

		
		if request.user in potential_friend.pending_friends.all():
			return Response(
				{'error': 'You have already sent a friend request to this user'},
				status=status.HTTP_400_BAD_REQUEST
			)

		
		if potential_friend in request.user.pending_friends.all():
			
			request.user.pending_friends.remove(potential_friend)
			request.user.friends.add(potential_friend)
			return Response(
				{'message': 'Friend request accepted! You are now friends.'},
				status=status.HTTP_200_OK
			)
		else:
			
			potential_friend.pending_friends.add(request.user)
			return Response(
				{'message': 'Friend request sent successfully'},
				status=status.HTTP_200_OK
			)

	except MyUser.DoesNotExist:
		return Response(
			{'error': 'User not found'},
			status=status.HTTP_404_NOT_FOUND
		)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_final(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		try:
			tournament.add_finalist(request.user)

			response_data = {
				'message': 'Successfully joined final',
			}

			return Response(response_data, status=status.HTTP_200_OK)

		except ValidationError as e:
			return Response(
				{'error': str(e)},
				status=status.HTTP_400_BAD_REQUEST
			)

	except Tournament.DoesNotExist:
		return Response(
			{'error': 'Tournament not found'},
			status=status.HTTP_404_NOT_FOUND
		)

def parse_tournament_data(tournament):
	
	players = [
		player.pseudo 
		for player in tournament.players.all()
	]
	
	
	finalists = [
		finalist.pseudo
		for finalist in tournament.finalist.all()
	]

	winner = tournament.winner.first().pseudo if tournament.winner.exists() else None
	
	tournament_data = {
		"tournament_code": tournament.code,
		"players": players,
		"finalists": finalists,
		"winner": winner
	}
	
	return tournament_data

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_winner(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		try:
			tournament.add_winner(request.user)
			tournament_data = parse_tournament_data(tournament)
			

			response_data = {
				'message': 'You won !!',
			}
				
			return Response(response_data, status=status.HTTP_200_OK)

		except ValidationError as e:
			return Response(
				{'error': str(e)},
				status=status.HTTP_400_BAD_REQUEST
			)

	except Tournament.DoesNotExist:
		return Response(
			{'error': 'Tournament not found'},
			status=status.HTTP_404_NOT_FOUND
		)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_tournament(request):
	try:
		tournament_code = request.data.get('tournament_code')
		if not tournament_code:
			return Response(
				{'error': 'Tournament code is required'},
				status=status.HTTP_400_BAD_REQUEST
			)

		tournament = Tournament.objects.get(code=tournament_code)

		
		if tournament.started:
			return Response(
				{'error': 'Tournament has already started'},
				status=status.HTTP_400_BAD_REQUEST
			)

		
		active_tournaments = Tournament.objects.filter(
			players=request.user,
			started=False
		).exclude(left=request.user)  

		if active_tournaments.exists() and not active_tournaments.filter(code=tournament_code).exists():
			return Response(
				{'error': 'You are already in another active tournament'},
				status=status.HTTP_400_BAD_REQUEST
			)

		
		try:
			tournament.add_player(request.user)

			response_data = {
				'message': 'Successfully joined tournament',
				'tournament_code': tournament.code,
				'players_count': tournament.players.count(),
				'started': tournament.started
			}

			return Response(response_data, status=status.HTTP_200_OK)

		except ValidationError as e:
			return Response(
				{'error': str(e)},
				status=status.HTTP_400_BAD_REQUEST
			)

	except Tournament.DoesNotExist:
		return Response(
			{'error': 'Tournament not found'},
			status=status.HTTP_404_NOT_FOUND
		)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tournament(request):
	
	active_tournaments = Tournament.objects.filter(
		players=request.user,
		started=False
	).exclude(left=request.user)

	if active_tournaments.exists():
		return Response({
			'error': 'You are already in an active tournament'
		}, status=status.HTTP_400_BAD_REQUEST)

	try:
		
		tournament = Tournament.objects.create()

		
		tournament.add_player(request.user)

		return Response({
			'message': 'Tournament created successfully',
			'tournament_code': tournament.code,
			'players_count': tournament.players.count(),
			'max_players': 4
		}, status=status.HTTP_201_CREATED)

	except Exception as e:
		return Response({
			'error': 'Failed to create tournament'
		}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_status(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		players = tournament.players.all()

		
		player_data = []
		for player in players:
			player_data.append({
				'username': player.username,
				'status': 'ready'  
			})

		return Response({
			'players_count': len(players),
			'players': player_data,
			'started': tournament.started,
			'is_full': len(players) >= 4,
			'is_active': True  
		})
	except Tournament.DoesNotExist:
		return Response({
			'error': 'Tournament not found'
		}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tournament_players(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		players = tournament.players.all()
		serializer = UserInfoSerializer(players, many=True)
		return Response({
			'tournament_code': tournament_code,
			'players': serializer.data
		})
	except Tournament.DoesNotExist:
		return Response({
			'error': 'Tournament not found'
		}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def erase_user(request):
	try:
		user = request.user
		users_with_pending = MyUser.objects.filter(pending_friends=user)
		for other_user in users_with_pending:
			other_user.pending_friends.remove(user)
		user.pending_friends.clear()
		user.friends.clear()
		user.delete()
		return Response(
			{'message': 'User and associated friend relationships deleted successfully'},
			status=status.HTTP_200_OK
		)
	except Exception as e:
		
		print(f"Error in erase_user: {str(e)}")
		return Response(
			{'error': 'An error occurred while deleting the user'},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quit_tournament(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		user = request.user
		if user not in tournament.players.all():
			return Response({'error': 'You are not in this tournament'}, status=status.HTTP_400_BAD_REQUEST)
		tournament.players.remove(user)
		deleted = False
		if tournament.players.count() == 0:
			tournament.delete()
			deleted = True
		else:	
			if tournament.creator == user:
				tournament.creator = tournament.players.first()
				tournament.save()
		return Response({
			'message': 'Successfully left tournament',
			'deleted': deleted
		}, status=status.HTTP_200_OK)

	except Tournament.DoesNotExist:
		return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tournament_matches(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
	except Tournament.DoesNotExist:
		return Response({"error": f"Tournament {tournament_code} does not exist"})

	matchs = tournament.all_matches.all()
	serializer = TournamentMatchSerializer(matchs, many=True)

	return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_match_opponent(request, tournament_code):
	user = request.user
	try:
		tournament = Tournament.objects.get(code=tournament_code)
	except Tournament.DoesNotExist:
		return Response({"error": f"Tournament {tournament_code} does not exist", status: 404})

	match = tournament.all_matches.all().filter(Q(player1=user) | Q(player2=user)).first()

	if match:
		my_match = TournamentMatchSerializer(match)
		match_data = my_match.data
		create = True if match_data['player1']['id'] == user.id else False
		if not create:
			return Response({
				'create': create
			})
		else:
			opponent = match_data['player2'] if match_data['player1']['id'] == user.id else match_data['player1']
			return Response({
				'opp_id': opponent['id'],
				'opp_name': opponent['pseudo'],
				'opp_avatar': opponent['avatar'],
				'create': create
			})
	else:
		return Response({"error": "No match found"},status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_final_opponent(request, tournament_code):
	user = request.user
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		
	except Tournament.DoesNotExist:
		return Response({"error": f"Tournament {tournament_code} does not exist"}, status=404)

	initial_matches = tournament.all_matches.filter(is_final=False)

	if initial_matches.count() == 2 and all(match.winner for match in initial_matches):
		winners = [match.winner for match in initial_matches]
		final_match = tournament.all_matches.filter(is_final=True).first()

		if not final_match:	
			tournament.create_final(winners[0], winners[1])
			print('after create_final', tournament.all_matches)
			final_match = tournament.all_matches.filter(is_final=True).first()

		match_data = TournamentMatchSerializer(final_match).data
		create = match_data['player1']['id'] == user.id
		if not create:
			return Response({
				'create': create
			})
		else:
			opponent = match_data['player2'] if match_data['player1']['id'] == user.id else match_data['player1']
			return Response({
				'opp_id': opponent['id'],
				'opp_name': opponent['pseudo'],
				'opp_avatar': opponent['avatar'],
				'create': create
			})

	return Response({"error": "Final match cannot be created yet - waiting for initial matches to complete"}, status=380)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def forfeit_tournament(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		user = request.user
		if user not in tournament.players.all():
			return Response(
				{'error': 'You are not in this tournament'},
				status=status.HTTP_400_BAD_REQUEST
			)
		if user in tournament.left.all():
			return Response(
				{'error': 'You have already forfeited this tournament'},
				status=status.HTTP_400_BAD_REQUEST
			)
		tournament.add_left(user)
		return Response({
			'message': 'Successfully forfeited tournament',
			'player': user.username
		})

	except Tournament.DoesNotExist:
		return Response(
			{'error': 'Tournament not found'},
			status=status.HTTP_404_NOT_FOUND
		)
	except ValidationError as e:
		return Response(
			{'error': str(e)},
			status=status.HTTP_400_BAD_REQUEST
		)
	except Exception as e:
		return Response(
			{'error': str(e)},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_left(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		user = request.user
		is_left = user in tournament.left.all()

		return Response({
			'is_left': is_left
		})

	except Tournament.DoesNotExist:
		return Response(
			{'error': 'Tournament not found'},
			status=status.HTTP_404_NOT_FOUND
		)
	except Exception as e:
		return Response(
			{'error': str(e)},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_final_players(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		players = tournament.players.all()
		initial_matches = tournament.all_matches.filter(is_final=False)
		finalists = []
		for match in initial_matches:
			if match.winner:
				finalists.append(match.winner)

		all_players_serializer = UserInfoSerializer(players, many=True)
		finalists_serializer = UserInfoSerializer(finalists, many=True)

		return Response({
			'tournament_code': tournament_code,
			'players': all_players_serializer.data,
			'finalists': finalists_serializer.data
		})
	except Tournament.DoesNotExist:
		return Response({
			'error': 'Tournament not found'
		}, status=status.HTTP_404_NOT_FOUND)

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def get_end_players(request, tournament_code):
# 	try:
# 		tournament = Tournament.objects.get(code=tournament_code)

# 		# Serialize all the data using UserInfoSerializer
# 		players_serializer = UserInfoSerializer(tournament.players.all(), many=True)
# 		finalists_serializer = UserInfoSerializer(tournament.finalist.all(), many=True)
# 		winner_serializer = UserInfoSerializer(tournament.winner.all(), many=True)

# 		return Response({
# 			'tournament_code': tournament_code,
# 			'players': players_serializer.data,
# 			'finalists': finalists_serializer.data,
# 			'winner': winner_serializer.data
# 		})
# 	except Tournament.DoesNotExist:
# 		return Response({
# 			'error': 'Tournament not found'
# 		}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_end_players(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)

		match_serializer = TournamentMatchSerializer(tournament.all_matches.all(), many=True)
		players_serializer = UserInfoSerializer(tournament.players.all(), many=True)
		finalists_serializer = UserInfoSerializer(tournament.finalist.all(), many=True)
		winner_serializer = UserInfoSerializer(tournament.winner.all(), many=True)

		return Response({
			'tournament_code': tournament_code,
			'matches': match_serializer.data,
			'players': players_serializer.data,
			'finalists': finalists_serializer.data,
			'winner': winner_serializer.data
		})
	except Tournament.DoesNotExist:
		return Response({
			'error': 'Tournament not found'
		}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_info_user(request, userName):
	try:
		user = MyUser.objects.get(username=userName)
		serializer = UserInfoSerializer(user)
		user_data = serializer.data

		if user.avatar:
			try:
				avatar_base64 = base64.b64encode(user.avatar).decode('utf-8')
				user_data['avatar'] = f"data:image/png;base64,{avatar_base64}"
			except Exception as e:
				return Response({'error': f'Error encoding avatar: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

		return Response(user_data)
	except MyUser.DoesNotExist:
		return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_history(request, userName):
	try:
		user = MyUser.objects.get(username=userName)
		matches = MatchHistory.objects.filter(user=user)
		serializer = MatchHistorySerializer(matches, many=True)
		return Response(serializer.data)
	except MyUser.DoesNotExist:
		return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def oauth(request):
	try:
		code = request.data.get('code')
		state = request.data.get('state')
		redirect_uri = "https://127.0.0.1:8443/oauth_callback/"
		if not code:
			return Response({"error": "Authorization code required"}, status=status.HTTP_400_BAD_REQUEST)
		client_id = os.getenv("OAUTH42_UID")
		client_secret = os.getenv("OAUTH42_SECRET")
		if not client_id or not client_secret:
			return Response({"error": "Server configuration error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

		token_response = requests.post(
			'https://api.intra.42.fr/oauth/token',
			data={
				'grant_type': 'authorization_code',
				'client_id': client_id,
				'client_secret': client_secret,
				'code': code,
				'redirect_uri': redirect_uri,
				'state': state
			}
		)
		token_response.raise_for_status() 
		access_token = token_response.json().get('access_token')

		user_response = requests.get(
			'https://api.intra.42.fr/v2/me',
			headers={'Authorization': f'Bearer {access_token}'}
		)
		user_response.raise_for_status()
		user_data = user_response.json()
			
		# Handle Avatar
		avatar_data = None
		pfp = user_data.get('image', {}).get('versions', {}).get('medium')
		if pfp:
			getpfp = requests.get(pfp)
			if getpfp.status_code == 200:
				content = getpfp.content
				# Check MIME type using first 1024 bytes
				try:
					mime_type = magic.Magic(mime=True).from_buffer(content[:1024])
				except Exception:
					mime_type = None
				# Check file extension from URL
				ext = os.path.splitext(pfp)[1].lower()
				# Check size
				if len(content) <= MAX_FILE_SIZE:
					if ext in ALLOWED_EXTENSIONS and mime_type and mime_type.startswith('image/'):
						avatar_data = content

		# Load default avatar if not set
		if not avatar_data:
			default_avatar_path = os.path.join(settings.MEDIA_ROOT, 'avatars', 'default.png')
			try:
				with open(default_avatar_path, 'rb') as f:
					avatar_data = f.read()
			except IOError:
				avatar_data = b''  # Fallback to empty bytes

		existing_user = MyUser.objects.filter(
			Q(email=user_data["email"]) | Q(username=user_data["login"])
		).first()
		existing_oauth_user = MyUser.objects.filter(
			Q(email=user_data["email"])
			& Q(username=user_data["login"])
			& Q(is_oauth=True)
		).first()
		if existing_oauth_user:	
			AccessToken.objects.filter(user=existing_oauth_user).delete()
			RefreshToken.objects.filter(user=existing_oauth_user).delete()
			refresh_token = RefreshToken.objects.create(user=existing_oauth_user)
			access_token = AccessToken.objects.create(
				user=existing_oauth_user, 
				refresh_token=refresh_token
			)
			return Response({
				'access_token': access_token.token,
				'access_expires': access_token.expires_at,
				'refresh_token': refresh_token.token,
				'refresh_expires': refresh_token.expires_at,
				'username': user_data.get('login')
			})
		elif existing_user:
			return Response(
				{"error": "A user with this email or username already exists."},
				status=status.HTTP_409_CONFLICT,
			)
		else:
			
			user = MyUser.objects.create(
				email=user_data.get('email'),
				username=user_data.get('login'),
				pseudo=user_data.get('login'),
				avatar=avatar_data,
				is_oauth=True
			)
			AccessToken.objects.filter(user=user).delete()
			RefreshToken.objects.filter(user=user).delete()
			
			refresh_token = RefreshToken.objects.create(user=user)
			access_token = AccessToken.objects.create(
				user=user, 
				refresh_token=refresh_token
			)
			return Response({
				'access_token': access_token.token,
				'access_expires': access_token.expires_at,
				'refresh_token': refresh_token.token,
				'refresh_expires': refresh_token.expires_at,
				'username' : user_data.get('login')
			})
	except requests.HTTPError as e:
		print(f"HTTP Error: {e}")
		return Response({"error": "Failed to communicate with 42 API"}, status=status.HTTP_502_BAD_GATEWAY)
	except Exception as e:
		print(f"Error: {e}")
		return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)