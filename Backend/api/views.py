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

@api_view(['POST'])
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
        refresh = RefreshToken.for_user(user)
        return Response({
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        response = Response({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
        response.set_cookie('access_token', access_token, httponly=True, secure=True, samesite='Lax')
        response.set_cookie('refresh_token', refresh_token, httponly=True, secure=True, samesite='Lax')
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
    
    serializer = MatchHistorySerializer(data=data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_matches(request):
    matches = MatchHistory.objects.filter(user=request.user)
    serializer = MatchHistorySerializer(matches, many=True)
    return Response(serializer.data)































from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.models import MyUser
from django.db import transaction

@api_view(['PATCH'])
@parser_classes([MultiPartParser, FormParser])
def edit_user_api(request):
    # Get the JWT token from cookies
    token_key = request.COOKIES.get('access_token')
    if not token_key:
        return HttpResponseForbidden("Token not provided.")

    # Validate the token
    jwt_auth = JWTAuthentication()
    try:
        validated_token = jwt_auth.get_validated_token(token_key)
        user = jwt_auth.get_user(validated_token)
    except Exception:
        return HttpResponseForbidden("Invalid token.")

    # Update user fields
    user = get_object_or_404(MyUser, pk=user.pk)

    try:
        with transaction.atomic():
            username = request.POST.get('username')
            if username:
                user.username = username

            password = request.POST.get('password')
            if password:
                user.password = make_password(password)

            description = request.POST.get('description')
            if description:
                user.description = description

            avatar = request.FILES.get('avatar')
            if avatar:
                user.avatar = avatar

            user.save()

        return JsonResponse({'status': 'success', 'message': 'User updated successfully'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)