from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.shortcuts import render
from .serializers import UserSerializer
from rest_framework import status
from .models import MyUser
from rest_framework.authtoken.models import Token
# from django.contrib.auth import get_user_model

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

def list_users(request):
    users = MyUser.objects.all()
    return render(request, 'api/list_users.html', {'users': users})

# @api_view(['POST'])
# def	loginToken(request):
    

