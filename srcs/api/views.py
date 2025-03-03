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
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from .serializers import MatchHistorySerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Q
from .serializers import UserInfoSerializer, TournamentMatchSerializer
from .models import Tournament, TournamentMatch
from .blockchain_storage import record_match
import re
import os
from .models import AccessToken, RefreshToken
from django.utils import timezone

import magic  # pip install python-magic


ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_view(['POST'])
@permission_classes([AllowAny])
def add_user(request):
	try:
		data = request.data.copy()
		avatar = request.FILES.get('avatar')
		if avatar:
			ext = os.path.splitext(avatar.name)[1].lower()
			mime_type = magic.Magic(mime=True).from_buffer(avatar.read(1024))
			avatar.seek(0)  # Rewind file after checking type

			# Vérification de l'extension et du type MIME
			if ext not in ALLOWED_EXTENSIONS or not mime_type.startswith('image/'):
				return Response({'error': 'Format de fichier non autorisé'}, status=status.HTTP_400_BAD_REQUEST)
			
			# Vérification de la taille
			if avatar.size > MAX_FILE_SIZE:
				return Response({'error': 'Fichier trop volumineux'}, status=status.HTTP_400_BAD_REQUEST)
			data['avatar'] = avatar

		serializer = UserSerializer(data=data)
		if serializer.is_valid():
			user = serializer.save()
			user.set_password(serializer.validated_data['password'])
			user.save()
			return Response(status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except Exception as e:
		print(f"Error: {e}")  # Log the actual error
		return Response(
			{'error': str(e)},  # Return the actual error message
			status=status.HTTP_400_BAD_REQUEST
		)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_online(request, username):
    try:
        user = MyUser.objects.get(username=username)
        
        # Get the latest valid access token
        valid_token = AccessToken.objects.filter(
            user=user,
            expires_at__gt=timezone.now()
        ).order_by('-created').first()  # CHANGED
        
        is_online = valid_token is not None
        
        return Response({
            'username': username,
            'is_online': is_online,
            'last_active': valid_token.expires_at if is_online else None
        })
        
    except MyUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
	username = request.data.get('username')
	password = request.data.get('password')
	user = authenticate(username=username, password=password)
	
	if user:
		# Delete existing tokens
		AccessToken.objects.filter(user=user).delete()
		RefreshToken.objects.filter(user=user).delete()
		
		# Create new tokens
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

        # Get refresh token object
        refresh_token_obj = RefreshToken.objects.get(token=refresh_token)
        
        # Delete existing access tokens for this user
        AccessToken.objects.filter(user=refresh_token_obj.user).delete()  # NEW
        
        # Create new access token
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
def add_match(request):
	data = request.data.copy()
	data['user'] = request.user.id

	# if request.data['type'] == 'magicDuel':
	if request.data['won']:
		request.user.wins += 1
		request.user.ligue_points += 15
	else:
		request.user.looses += 1
		request.user.ligue_points -= 15
	request.user.save()

	serializer = MatchHistorySerializer(data=data)
	if serializer.is_valid():
		serializer.save(user=request.user)
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# VUE DE TEST
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
		return Response(serializer.data)
	else:
		return Response({'error': 'User not found or not connected'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
	try:
		# Delete access token
		AccessToken.objects.filter(user=request.user).delete()
		# Delete refresh token
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

	# Only include fields that were actually sent
	if request.data.get('username'):
		data['username'] = request.data['username']

	if request.data.get('password'):
		user.set_password(request.data['password'])
		user.save()

	if request.data.get('description'):
		data['description'] = request.data['description']

	if request.data.get('pseudo'):
		data['pseudo'] = request.data['pseudo']

	if request.FILES.get('avatar'):
		data['avatar'] = request.FILES['avatar']
		avatar = request.FILES['avatar']
		ext = os.path.splitext(avatar.name)[1].lower()
		mime_type = magic.Magic(mime=True).from_buffer(avatar.read(1024))
		avatar.seek(0)  # Rewind file after checking type
		# Vérification de l'extension et du type MIME
		if ext not in ALLOWED_EXTENSIONS or not mime_type.startswith('image/'):
			return Response({'error': 'Format de fichier non autorisé'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Vérification de la taille
		if avatar.size > MAX_FILE_SIZE:
			return Response({'error': 'Fichier trop volumineux'}, status=status.HTTP_400_BAD_REQUEST)
		data['avatar'] = avatar

	# Only proceed with update if there's data to update
	if data:
		serializer = UserSerializer(user, data=data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return Response({
				'message': 'User updated successfully'
			}, status=status.HTTP_200_OK)
		return Response({
			'message': 'Invalid data provided',
			'errors': serializer.errors
		}, status=status.HTTP_400_BAD_REQUEST)

	# If no data was provided but request was valid
	if not data and not request.data.get('password'):
		return Response({
			'message': 'No changes were made'
		}, status=status.HTTP_200_OK)

	# If only password was changed
	return Response({
		'message': 'User updated successfully'
	}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friends(request):
	friends = request.user.friends.all()
	serializer = UserInfoSerializer(friends, many=True)
	return Response(serializer.data)

# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def add_friend(request):
#     try:
#         friend = MyUser.objects.get(username=request.data['friend_name'])
#         request.user.friends.add(friend)
#         return Response({'message': 'Friend added successfully'}, status=status.HTTP_200_OK)
#     except MyUser.DoesNotExist:
#         return Response(
#             {'error': 'User not found'},
#             status=status.HTTP_404_NOT_FOUND
#         )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_friends(request):
	pending_friends = request.user.pending_friends.all()
	serializer = UserInfoSerializer(pending_friends, many=True)
	return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_friend(request):
    try:
        potential_friend = MyUser.objects.get(username=request.data['friend_name'])

        # Don't allow adding yourself
        if potential_friend == request.user:
            return Response(
                {'error': 'You cannot add yourself as a friend'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Don't allow if already friends
        if potential_friend in request.user.friends.all():
            return Response(
                {'error': 'You are already friends with this user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if the sender has already sent a request to the recipient
        if request.user in potential_friend.pending_friends.all():
            return Response(
                {'error': 'You have already sent a friend request to this user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if the recipient has sent a request to the sender
        if potential_friend in request.user.pending_friends.all():
            # Recipient has sent a request to the sender, so accept the request
            request.user.pending_friends.remove(potential_friend)
            request.user.friends.add(potential_friend)
            return Response(
                {'message': 'Friend request accepted! You are now friends.'},
                status=status.HTTP_200_OK
            )
        else:
            # If no pending requests exist, add to pending list
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
	# Récupérer tous les joueurs et convertir en liste de pseudos
	players = [
		player.pseudo 
		for player in tournament.players.all()
	]
	
	# Récupérer les finalistes et convertir en liste de pseudos
	finalists = [
		finalist.pseudo
		for finalist in tournament.finalist.all()
	]

	winner = tournament.winner.first().pseudo if tournament.winner.exists() else None
	print(winner)
	# Créer le dictionnaire de données formaté
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
			#record_match(tournament_data, tournament_code)

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

		# Check if tournament has already started
		if tournament.started:
			return Response(
				{'error': 'Tournament has already started'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Check if user is already in tournament
		active_tournaments = Tournament.objects.filter(
			players=request.user,
			started=False
		).exclude(left=request.user)  # Exclude tournaments where user is in left list

		if active_tournaments.exists() and not active_tournaments.filter(code=tournament_code).exists():
			return Response(
				{'error': 'You are already in another active tournament'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Try to add player
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
	# Check if user is already in an active tournament
	active_tournaments = Tournament.objects.filter(
		players=request.user,
		started=False
	).exclude(left=request.user)

	if active_tournaments.exists():
		return Response({
			'error': 'You are already in an active tournament'
		}, status=status.HTTP_400_BAD_REQUEST)

	try:
		# Create new tournament
		tournament = Tournament.objects.create()

		# Add creator as first player
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

		# Serialize player information
		player_data = []
		for player in players:
			player_data.append({
				'username': player.username,
				'status': 'ready'  # You can add more status logic here
			})

		return Response({
			'players_count': len(players),
			'players': player_data,
			'started': tournament.started,
			'is_full': len(players) >= 4,
			'is_active': True  # You can add logic to determine if tournament is still active
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

		# Get all users who have this user in their pending friends
		users_with_pending = MyUser.objects.filter(pending_friends=user)
		for other_user in users_with_pending:
			other_user.pending_friends.remove(user)

		# Clear the user's own pending friends
		user.pending_friends.clear()

		# Clear friends (symmetrical relationship will handle both sides)
		user.friends.clear()

		# Finally delete the user
		user.delete()

		return Response(
			{'message': 'User and associated friend relationships deleted successfully'},
			status=status.HTTP_200_OK
		)
	except Exception as e:
		# Log the specific error for debugging
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

		# Remove player from tournament
		tournament.players.remove(user)
		deleted = False

		# Delete tournament if no players left
		if tournament.players.count() == 0:
			tournament.delete()
			deleted = True
		else:
			# If tournament creator left, assign new creator
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
				'opp_name': opponent['username'],
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

	# Get all non-final matches
	initial_matches = tournament.all_matches.filter(is_final=False)

	# Check if both initial matches have winners
	if initial_matches.count() == 2 and all(match.winner for match in initial_matches):
		winners = [match.winner for match in initial_matches]

		# Check if final match already exists
		final_match = tournament.all_matches.filter(is_final=True).first()

		if not final_match:
			# Create final match if it doesn't exist
			tournament.create_final(winners[0], winners[1])
			final_match = tournament.all_matches.filter(is_final=True).first()

		# Serialize the final match data
		match_data = TournamentMatchSerializer(final_match).data

		# Determine if current user is player1 (creator) or player2
		create = match_data['player1']['id'] == user.id

		if not create:
			return Response({
				'create': create
			})
		else:
			# Get opponent info based on user's position
			opponent = match_data['player2'] if match_data['player1']['id'] == user.id else match_data['player1']
			return Response({
				'opp_id': opponent['id'],
				'opp_name': opponent['username'],
				'opp_avatar': opponent['avatar'],
				'create': create
			})

	return Response({"error": "Final match cannot be created yet - waiting for initial matches to complete"}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def forfeit_tournament(request, tournament_code):
	try:
		# Get the tournament and verify it exists
		tournament = Tournament.objects.get(code=tournament_code)
		user = request.user

		# Verify user is in tournament
		if user not in tournament.players.all():
			return Response(
				{'error': 'You are not in this tournament'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Check if user is already in left list
		if user in tournament.left.all():
			return Response(
				{'error': 'You have already forfeited this tournament'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Add user to the left list
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
		# Get the tournament and verify it exists
		tournament = Tournament.objects.get(code=tournament_code)
		user = request.user

		# Check if user is in left list
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

		# Get initial matches to find winners who will be finalists
		initial_matches = tournament.all_matches.filter(is_final=False)
		finalists = []

		# Get winners from initial matches who will be finalists
		for match in initial_matches:
			if match.winner:
				finalists.append(match.winner)

		# Serialize all players and finalists
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_end_players(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)

		# Serialize all the data using UserInfoSerializer
		players_serializer = UserInfoSerializer(tournament.players.all(), many=True)
		finalists_serializer = UserInfoSerializer(tournament.finalist.all(), many=True)
		winner_serializer = UserInfoSerializer(tournament.winner.all(), many=True)

		return Response({
			'tournament_code': tournament_code,
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
        return Response(serializer.data)
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

