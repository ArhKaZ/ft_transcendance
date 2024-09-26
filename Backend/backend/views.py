from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import HttpResponseForbidden, HttpResponseRedirect
from rest_framework.authtoken.models import Token
from django.urls import reverse

def main(request):
    return render(request, "backend/home.html")

@api_view(['GET'])
def logged(request):
    token_key = request.COOKIES.get('auth_token')  # Récupérer le token depuis le cookie
    
    if not token_key:
        return HttpResponseForbidden("Token not provided.")
    
    try:
        token = Token.objects.get(key=token_key)
        request.user = token.user  # Authentifier l'utilisateur
    except Token.DoesNotExist:
        return HttpResponseRedirect(reverse('login'))
    
    return render(request, "backend/logged.html")