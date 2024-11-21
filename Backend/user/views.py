from rest_framework.response import Response
from django.shortcuts import render, redirect
from rest_framework.decorators import api_view
from rest_framework import status
from django.http import HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.urls import reverse
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from rest_framework.exceptions import AuthenticationFailed



def addPage(request):
    return render(request, "user/add.html")

def loginPage(request):
    return render(request, "user/login.html")

def edit_user(request):
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
    
    return render(request, "user/edit_user.html", {'user': request.user})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_history(request):
    try:
        # Si l'utilisateur est authentifié, on affiche la page.
        return render(request, "user/history.html")
    except AuthenticationFailed:
        # Si une exception d'authentification est levée, on redirige.
        return redirect('loginPage')  # Remplacez 'login' par le nom de votre vue de connexion.

