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
from .serializers import UserInfoSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def add_user(request):
	data = request.data.copy()
	avatar = request.FILES.get('avatar')
	if avatar:
		data['avatar'] = avatar

	serializer = UserSerializer(data=data)
	if serializer.is_valid():
		user = serializer.save()
		user.set_password(serializer.validated_data['password'])
		user.save()
		return Response(status=status.HTTP_201_CREATED)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
	username = request.data.get('username')
	password = request.data.get('password')
	if not username or not password:
		return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)
	user = authenticate(username=username, password=password)
	if user is not None:
		token, created = Token.objects.get_or_create(user=user)
		if not created:
			token.delete()
			token = Token.objects.create(user=user)
		response = Response({'detail': 'Success', 'token_key': token.key} , status=status.HTTP_200_OK)
		return response
	else:
		return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
	

def list_users(request):
	users = MyUser.objects.all()
	return render(request, 'api/list_users.html', {'users': users})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_match(request):
	data = request.data.copy()
	data['user'] = request.user.id
	
	print(request.user)
	if request.data['won']:
		request.user.ligue_points += 15
	else:
		request.user.ligue_points -= 15
	request.user.save()
	serializer = MatchHistorySerializer(data=data)
	if serializer.is_valid():
		serializer.save(user=request.user)
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_history(request):
	matches = MatchHistory.objects.filter(user=request.user)
	serializer = MatchHistorySerializer(matches, many=True)
	return Response(serializer.data)

@api_view(['GET'])
def get_my_info(request):
	print("in the fucntion")
	user = request.user
	serializer = UserInfoSerializer(user)
	if user:
		return Response(serializer.data)
	else:
		return Response({'error': 'User not found or not connected'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def logout_user(request):
	# Delete the token
	request.user.auth_token.delete()
	return Response({'message': 'Logged out successfully'})

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
		
	if request.FILES.get('avatar'):
		data['avatar'] = request.FILES['avatar']
	
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