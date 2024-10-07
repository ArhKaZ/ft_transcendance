from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import HttpResponseForbidden, HttpResponseRedirect
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.urls import reverse

def main(request):
    return render(request, "backend/home.html")

@api_view(['GET'])
def logged(request):
    token_key = request.COOKIES.get('access_token')  # Récupérer le token JWT du cookie
    
    if not token_key:
        return HttpResponseForbidden("Token not provided.")
    
    jwt_auth = JWTAuthentication()
    
    try:
        validated_token = jwt_auth.get_validated_token(token_key)  # Valider le token JWT
        user = jwt_auth.get_user(validated_token)  # Extraire l'utilisateur à partir du token validé
        request.user = user
    except Exception:
        return HttpResponseRedirect(reverse('login'))  # Rediriger si le token n'est pas valide
    
    return render(request, "backend/logged.html", {'user': request.user})