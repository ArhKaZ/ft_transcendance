from rest_framework.response import Response
from django.shortcuts import render, redirect
from rest_framework.decorators import api_view
from rest_framework import status
from .serializers import UserSerializer


def addPage(request):
    return render(request, "user/add.html")


@api_view(['POST'])
def add_user(request):
    if request.method == 'POST':
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return redirect('/home')
        return redirect('/user/add')
