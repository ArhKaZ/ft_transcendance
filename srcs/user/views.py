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
from django.views.decorators.csrf import csrf_exempt

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

