from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .serializers import UserSerializer
from rest_framework import status
from .models import MyUser, MatchHistory, Badge
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from .serializers import MatchHistorySerializer, sanitize_filename
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .serializers import UserInfoSerializer, TournamentMatchSerializer, SafePseudoValidator, StrongPasswordValidator, BadgeSerializer
from django.core.exceptions import ValidationError
from .blockchain_storage import record_match
import bleach
import os
from .models import AccessToken, RefreshToken, Tournament
from django.utils import timezone
from django.conf import settings
import base64
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from api.serializers import UserInfoSerializer
from rest_framework import serializers
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
		username = data.get('username', '')
		avatar = request.FILES.get('avatar')

		if "42" in username:
			return Response({'error': "The username cannot contain '42'."}, status=status.HTTP_400_BAD_REQUEST)

		if avatar:
			avatar.name = sanitize_filename(avatar.name)
			ext = os.path.splitext(avatar.name)[1].lower()
			mime_type = magic.Magic(mime=True).from_buffer(avatar.read(1024))
			avatar.seek(0)

			if ext not in ALLOWED_EXTENSIONS or not mime_type.startswith('image/'):
				return Response({'error': 'Unauthorized file format'}, status=status.HTTP_400_BAD_REQUEST)

			if avatar.size > MAX_FILE_SIZE:
				return Response({'error': 'File too heavy'}, status=status.HTTP_400_BAD_REQUEST)

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
			'refresh_expires': refresh_token.expires_at,
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
		if user.avatar:
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
		avatar.name = sanitize_filename(avatar.name)
		ext = os.path.splitext(avatar.name)[1].lower()
		mime_type = magic.Magic(mime=True).from_buffer(avatar.read(1024))
		avatar.seek(0)

		if ext not in ALLOWED_EXTENSIONS or not mime_type.startswith('image/'):
			return Response({'error': 'Unauthorized file format'}, status=status.HTTP_400_BAD_REQUEST)

		if avatar.size > MAX_FILE_SIZE:
			return Response({'error': 'File too heavy'}, status=status.HTTP_400_BAD_REQUEST)

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
		return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

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
def get_pending_friends_another(request, userName):
	profile_user = MyUser.objects.get(username=userName)
	pending_friends = profile_user.pending_friends.all()
	if pending_friends:
		serializer = UserInfoSerializer(pending_friends, many=True)
		return Response(serializer.data)
	return Response([])

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
				{'error': 'You are already friend with this user'},
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
				{
					'message': 'Friend request accepted! You are now friends.',
					'pending': False,
				},
				status=status.HTTP_200_OK
			)
		else:
			potential_friend.pending_friends.add(request.user)
			return Response(
				{
					'message': 'Friend request sent successfully',
					'pending': True,
				},
				status=status.HTTP_200_OK
			)

	except MyUser.DoesNotExist:
		return Response(
			{'error': 'User not found'},
			status=status.HTTP_404_NOT_FOUND
		)
	
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_friend(request):
	try:
		potential_friend = MyUser.objects.get(username=request.data['friend_name'])

		if potential_friend == request.user:
			return Response(
				{'error': 'You cannot add yourself as a friend'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if potential_friend not in request.user.friends.all():
			return Response(
				{'error': 'You are not friend with this user'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if request.user in potential_friend.pending_friends.all():
			return Response(
				{'error': 'You are pending to be friend with this user'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if potential_friend in request.user.friends.all():
			request.user.friends.remove(potential_friend)
			return Response(
				{
					'message': "Friend delete. You no more friend with him"
				},
				status=status.HTTP_200_OK
			)
		
	except MyUser.DoesNotExist:
		return Response(
			{
				'error': 'User not found'
			},
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
def record_match_blockchain(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)
		if tournament.is_recorded:
			return Response(
				{'message': 'Match already recorded'},
				status=status.HTTP_200_OK
			)
		try:
			tournament_data = parse_tournament_data(tournament)
			record_match(tournament_data, tournament_code)
			tournament.is_recorded = True
			tournament.save()
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
			return Response({'error': 'Tournament code is required'}, status=status.HTTP_400_BAD_REQUEST)

		tournament = Tournament.objects.get(code=tournament_code)

		active_tournaments = Tournament.objects.filter(
			players=request.user,
			started=False
		).exclude(left=request.user).exclude(code=tournament_code)

		for active_tournament in active_tournaments:
			active_tournament.players.remove(request.user)
			active_tournament.left.add(request.user)
			if active_tournament.players.count() == 0:
				active_tournament.delete()
			else:
				if active_tournament.creator == request.user:
					active_tournament.creator = active_tournament.players.first()
					active_tournament.save()

		if tournament.started:
			return Response({'error': 'Tournament has already started'}, status=status.HTTP_400_BAD_REQUEST)
		if tournament.is_recorded:
			return Response({'error': 'Tournament is already finished'}, status=status.HTTP_400_BAD_REQUEST)
		try:
			tournament.add_player(request.user)
			user = MyUser.objects.get(id=request.user.id)
			user.enter_in_tournament(tournament=tournament)
			response_data = {
				'message': 'Successfully joined tournament',
				'tournament_code': tournament.code,
				'players_count': tournament.players.count(),
				'started': tournament.started
			}
			return Response(response_data, status=status.HTTP_200_OK)
		except ValidationError as e:
			return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

	except Tournament.DoesNotExist:
		return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tournament(request):
	active_tournaments = Tournament.objects.filter(
		players=request.user,
		started=False
	).exclude(left=request.user)

	for tournament in active_tournaments:
		tournament.players.remove(request.user)
		tournament.left.add(request.user)
		if tournament.players.count() == 0:
			tournament.delete()
		else:
			if tournament.creator == request.user:
				tournament.creator = tournament.players.first()
				tournament.save()

	try:
		tournament = Tournament.objects.create(creator=request.user)
		tournament.add_player(request.user)
		user = MyUser.objects.get(id=request.user.id)
		user.enter_in_tournament(tournament=tournament)
		return Response({
			'message': 'Tournament created successfully',
			'tournament_code': tournament.code,
			'players_count': tournament.players.count(),
			'max_players': 4
		}, status=status.HTTP_201_CREATED)
	except Exception as e:
		return Response({'error': 'Failed to create tournament'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
		user = MyUser.objects.get(id=request.user.id)
		user.quit_tournament()
		return Response({
			'message': 'Successfully left tournament',
			'deleted': deleted
		}, status=status.HTTP_200_OK)

	except Tournament.DoesNotExist:
		return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

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

def is_solo_in_tournament(tournament):
	print(f'left count of tour {tournament.left.count()}')
	if tournament.left.count() == 3:
		return True
	return False

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tournament_players(request, tournament_code):
	try:
		tournament = Tournament.objects.get(code=tournament_code)

		is_solo_in = is_solo_in_tournament(tournament=tournament)
		if is_solo_in and not tournament.winner.exists:
			tournament.add_winner(request.user)
		match_serializer = TournamentMatchSerializer(tournament.all_matches.all(), many=True)
		players_serializer = UserInfoSerializer(tournament.players.all(), many=True)
		finalists_serializer = UserInfoSerializer(tournament.finalist.all(), many=True)
		winner_serializer = UserInfoSerializer(tournament.winner.all(), many=True)

		return Response({
			'tournament_code': tournament_code,
			'matches': match_serializer.data,
			'players': players_serializer.data,
			'finalists': finalists_serializer.data,
			'winner': winner_serializer.data,
			'is_solo': is_solo_in,
		})
	except Tournament.DoesNotExist:
		return Response({
			'error': 'Tournament not found'
		}, status=status.HTTP_404_NOT_FOUND)
	except ValidationError as e:
		return Response({
			'error': f'Error: {e}'
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

@api_view(['GET'])
@permission_classes([AllowAny])
def get_https_address_env(request):
	return Response({"address": os.getenv('HTTPS_ADDRESS')})

@api_view(['POST'])
@permission_classes([AllowAny])
def oauth(request):
	try:
		code = request.data.get('code')
		https_address = os.getenv("HTTPS_ADDRESS")
		redirect_uri = f"{https_address}/oauth_callback/"
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
		oauth_login = user_data.get('login') + '42'

		avatar_data = None
		pfp = user_data.get('image', {}).get('versions', {}).get('medium')
		if pfp:
			getpfp = requests.get(pfp)
			if getpfp.status_code == 200:
				content = getpfp.content
				try:
					mime_type = magic.Magic(mime=True).from_buffer(content[:1024])
				except Exception:
					mime_type = None
				ext = os.path.splitext(pfp)[1].lower()
				if len(content) <= MAX_FILE_SIZE:
					if ext in ALLOWED_EXTENSIONS and mime_type and mime_type.startswith('image/'):
						avatar_data = content

		if not avatar_data:
			default_avatar_path = os.path.join(settings.MEDIA_ROOT, 'avatars', 'default.png')
			try:
				with open(default_avatar_path, 'rb') as f:
					avatar_data = f.read()
			except IOError:
				avatar_data = b''

		existing_oauth_user = MyUser.objects.filter(
			Q(email=user_data["email"])
			& Q(username=oauth_login)
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
				'username': oauth_login
		})
		else:
			user = MyUser.objects.create(
				email=user_data.get('email'),
				username=oauth_login,
				pseudo=oauth_login,
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
				'username' : oauth_login
			})
	except requests.HTTPError as e:
		print(f"HTTP Error: {e}")
		return Response({"error": "Failed to communicate with 42 API"}, status=status.HTTP_502_BAD_GATEWAY)
	except Exception as e:
		print(f"Error: {e}")
		return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spend_ticket(request):
	user = request.user

	if user.spend_ticket():
		badges = Badge.objects.order_by('?')[:3]
		badge_names = [badge.name for badge in badges]
		user.drawn_badges = badge_names
		user.need_badge = True
		user.save()
		return Response({
			"success": True,
			"remaining_tickets": user.tickets,
			"badges": BadgeSerializer(badges, many=True).data
		})
	return Response({
		"success": False,
		"message": "Not enough tickets",
		"remaining_tickets": user.tickets
	}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_badge(request):
	user = request.user
	badge_name = request.data.get("badge_name")

	if not badge_name:
		return Response({"error": "Badge name is required"}, status=status.HTTP_400_BAD_REQUEST)

	if badge_name not in user.drawn_badges:
		return Response({"error": "You didn't get this badge"}, status=status.HTTP_400_BAD_REQUEST)

	if not Badge.objects.filter(name=badge_name).exists():
		return Response({"error": "This badge doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

	if (user.need_badge == False):
		return Response({"error": "You must have a ticket to gamble"}, status=status.HTTP_400_BAD_REQUEST)

	user.need_badge = False

	if badge_name in user.badge_list:
		return Response({"error": "Sorry, you already have this badge"}, status=status.HTTP_400_BAD_REQUEST)

	user.badge_list.append(badge_name)
	user.save()
	return Response({"message": f"Badge '{badge_name}' added successfully!", "badge_list": user.badge_list}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def	list_badge(request):
	user = request.user
	badges = Badge.objects.filter(name__in=user.badge_list)
	badge_data = BadgeSerializer(badges, many=True).data
	return Response({"badges": badge_data}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_active_badge(request):
	user = request.user
	old_badge_name = request.data.get("old_badge_name")
	new_badge_name = request.data.get("new_badge_name")

	if not new_badge_name:
		return Response({"error": "Need a new badge name"}, status=status.HTTP_400_BAD_REQUEST)

	if not Badge.objects.filter(name=new_badge_name).exists():
		return Response({"error": "New badge does not exist"}, status=status.HTTP_400_BAD_REQUEST)

	if new_badge_name not in user.badge_list:
		return Response({"error": "You don't have this badge"}, status=status.HTTP_400_BAD_REQUEST)

	if new_badge_name in user.active_badge:
		return Response({"error": "This badge is already active"}, status=status.HTTP_400_BAD_REQUEST)

	if len(user.active_badge) == 3:
		if not old_badge_name:
			return Response({"error": "Need a badge to change"}, status=status.HTTP_400_BAD_REQUEST)
		if old_badge_name not in user.active_badge:
			return Response({"error": "Old badge must be active"}, status=status.HTTP_400_BAD_REQUEST)
		user.active_badge[user.active_badge.index(old_badge_name)] = new_badge_name
	else:
		user.active_badge.append(new_badge_name)
	
	user.save()
	return Response({"message": "Badge is now active"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_active_badge(request, username=None):
	try:
		if username:
			user = MyUser.objects.get(username=username)
		else:
			user = request.user

		actives_badges = Badge.objects.filter(name__in=user.active_badge)
		active_badge_data = BadgeSerializer(actives_badges, many=True).data
		return Response({"actives_badges": active_badge_data}, status=status.HTTP_200_OK)
	except MyUser.DoesNotExist:
		return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


