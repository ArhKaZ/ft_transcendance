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

@api_view(['POST'])
def add_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(serializer.validated_data['password'])
        user.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
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
         token, _ = Token.objects.get_or_create(user=user)
         response = HttpResponseRedirect(reverse('logged'))
         response.set_cookie('auth_token', token.key, httponly=True)
         return response
    #     # return redirect(reverse('backend:logged'))
    #     return Response({
    #         "token": token.key,
    #         "user": UserSerializer(user).data
    #     }, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


def list_users(request):
    users = MyUser.objects.all()
    return render(request, 'api/list_users.html', {'users': users})

