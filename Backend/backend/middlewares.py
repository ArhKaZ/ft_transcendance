from functools import wraps
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class JWTAuthCookieMiddleware(MiddlewareMixin):
    def authenticate(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return None
        
        # Add "Bearer" prefix
        raw_token = f"Bearer {access_token}"
        
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token



# from functools import wraps
# from django.http import JsonResponse

# def jwt_auth_cookie_required(view_func):
#     @wraps(view_func)
#     def _wrapped_view(request, *args, **kwargs):
#         access_token = request.COOKIES.get('access_token')
#         if access_token:
#             request.META['HTTP_AUTHORIZATION'] = f'Bearer {access_token}'
#         else:
#             return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
#         return view_func(request, *args, **kwargs)
#     return _wrapped_view