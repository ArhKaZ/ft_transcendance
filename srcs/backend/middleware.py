from django.shortcuts import redirect
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTAuthRedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response  

    def __call__(self, request):
        
        public_urls = ["/user/login/", "/api/login/", "/home/"]  

        
        if any(request.path.startswith(url) for url in public_urls):
            return self.get_response(request)

        
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            
            return redirect('/user/login/')  

        
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(access_token)  
            user = jwt_auth.get_user(validated_token)  
            request.user = user  
        except Exception:
            
            return redirect('/user/login/')

        
        return self.get_response(request)

class OAuthCSRFExemptMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        
        if request.path == '/api/oauth/' and request.method == 'POST':
            request._dont_enforce_csrf_checks = True
        
        response = self.get_response(request)
        return response