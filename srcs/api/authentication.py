from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from django.utils import timezone
from .models import AccessToken, RefreshToken

class AccessTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or 'Bearer ' not in auth_header:
            return None
            
        token_key = auth_header.split(' ')[1]
        try:
            token = AccessToken.objects.get(token=token_key)
            if token.is_expired():
                token.delete()
                raise exceptions.AuthenticationFailed('Access token expired')
            return (token.user, None)
        except AccessToken.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid access token')

class RefreshTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token_key = request.data.get('refresh_token')
        if not token_key:
            return None
            
        try:
            token = RefreshToken.objects.get(token=token_key)
            if token.is_expired():
                token.delete()
                raise exceptions.AuthenticationFailed('Refresh token expired')
            return (token.user, None)
        except RefreshToken.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid refresh token')