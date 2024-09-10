from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.shortcuts import render
from .serializers import UserSerializer
from rest_framework import status
from .models import User

@api_view(['POST'])
def add_user(request):
    serializer = UserSerializer(data=request.POST)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "User added successfully"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def list_users(request):
    users = User.objects.all()
    return render(request, 'api/list_users.html', {'users': users})