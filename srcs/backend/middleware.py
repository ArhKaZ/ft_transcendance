from django.shortcuts import redirect
 from rest_framework_simplejwt.authentication import JWTAuthentication

class OAuthCSRFExemptMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        
        if request.path == '/api/oauth/#' and request.method == 'POST':
            request._dont_enforce_csrf_checks = True
        
        response = self.get_response(request)
        return response