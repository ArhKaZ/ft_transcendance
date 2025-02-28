from cryptography.hazmat.primitives.twofactor import InvalidToken
from django.core.exceptions import ValidationError
from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from api.models import MyUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication

def index(request):
	return render(request, 'index.html')

# @api_view(['GET'])
# def logged(request):
#     authentication_classes = [TokenAuthentication]
#     user = request.user
#     friends = MyUser.objects.all()

#     return render(request, "backend/logged.html", {'user': request.user, 'friend': friends})


# @api_view(['GET'])
# def logged_get_user(request):
#     access_token = request.COOKIES.get('access_token')  # Récupérer le token JWT du cookie

#     if not access_token:
#         return JsonResponse({"error": "No token"}, status=403)

#     jwt_auth = JWTAuthentication()

#     try:
#         validated_token = jwt_auth.get_validated_token(access_token)  # Valider le token JWT
#         user = jwt_auth.get_user(validated_token) # Extraire l'utilisateur à partir du token validé
#         return JsonResponse({
#             "id": user.id,
#             "username": user.username,
#             "src_avatar": user.avatar.url, 
#             "ligue_points": user.ligue_points
#         })
#     except ValidationError as e:
#         return JsonResponse({"error": str(e)}, status=401)
#     except InvalidToken as e:
#         return JsonResponse({"error": "Invalid Token"}, status=401)
#     except MyUser.DoesNotExist:
#         return JsonResponse({"error": "User does not exist"}, status=404)
#     except Exception as e:
#         return JsonResponse({"error": e}, status=500)