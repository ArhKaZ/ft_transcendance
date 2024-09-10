from rest_framework.response import Response
from django.shortcuts import render, redirect
from rest_framework.decorators import api_view
from rest_framework import status

def addPage(request):
    return render(request, "user/add.html")
