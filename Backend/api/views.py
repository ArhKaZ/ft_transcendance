from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.shortcuts import render, redirect
from .serializers import UserSerializer
from rest_framework import status
from .models import MyUser
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.urls import reverse
from django.http import HttpResponseRedirect
from rest_framework_simplejwt.tokens import RefreshToken

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
    
    if username is None or password is None:
        return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        refresh = RefreshToken.for_user(user)
        response = HttpResponseRedirect(reverse('logged'))
        response.set_cookie('access_token', str(refresh.access_token), httponly=True, secure=True, samesite='Lax')
        response.set_cookie('refresh_token', str(refresh), httponly=True, secure=True, samesite='Lax')

        return response
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


def list_users(request):
    users = MyUser.objects.all()
    return render(request, 'api/list_users.html', {'users': users})

