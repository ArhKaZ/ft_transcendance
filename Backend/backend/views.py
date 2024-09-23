from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


def main(request):
    return render(request, "backend/home.html")

@permission_classes([IsAuthenticated])
def logged(request):
    return render(request, "backend/logged.html")