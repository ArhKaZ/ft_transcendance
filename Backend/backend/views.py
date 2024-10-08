from cryptography.hazmat.primitives.twofactor import InvalidToken
from django.core.exceptions import ValidationError
from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
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


@api_view(['GET'])
def logged_get_user(request):
    token_key = request.COOKIES.get('access_token')  # Récupérer le token JWT du cookie

    print(token_key)

    if not token_key:
        return JsonResponse({"error": "No token"}, status=403) #changer pour recuperer l'erreur dans le try catch
    print(1)
    jwt_auth = JWTAuthentication()
    print(2)
    try:
        print(3)
        validated_token = jwt_auth.get_validated_token(token_key)  # Valider le token JWT
        print(4, validated_token)
        user = jwt_auth.get_user(validated_token)  # Extraire l'utilisateur à partir du token validé
        print(5)
        return JsonResponse({
            "id": user.id,
            "username": user.username,
        })
    except ValidationError as e:
        return JsonResponse({"error": str(e)}, status=401)
    except InvalidToken as e:
        return JsonResponse({"error": "Invalid Token"}, status=401)
    except Exception as e:
        return JsonResponse({"error": e}, status=500)