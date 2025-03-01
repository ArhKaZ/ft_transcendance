from django.shortcuts import redirect
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTAuthRedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response  # Méthode appelée pour obtenir une réponse

    def __call__(self, request):
        # Exclure les URL publiques ou spécifiques
        public_urls = ["/user/login/", "/api/login/", "/home/"]  # Ajoutez /home ici

        # Si l'URL est dans la liste des URL publiques, ne pas intercepter la requête
        if any(request.path.startswith(url) for url in public_urls):
            return self.get_response(request)

        # Récupérer le token JWT dans les cookies
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            # Rediriger vers la page de connexion si aucun token n'est fourni
            return redirect('/user/login/')  # Remplacez par l'URL ou le nom de votre vue de connexion

        # Valider le token JWT
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(access_token)  # Valider le token
            user = jwt_auth.get_user(validated_token)  # Obtenir l'utilisateur
            request.user = user  # Associer l'utilisateur à la requête
        except Exception:
            # Rediriger si le token est invalide ou expiré
            return redirect('/user/login/')

        # Continuer la chaîne de traitement des requêtes
        return self.get_response(request)
