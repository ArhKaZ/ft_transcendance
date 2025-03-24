#!/bin/bash

set -e

host="$1"
shift
cmd="$@"

until python -c "import psycopg2; conn = psycopg2.connect(dbname='$POSTGRES_DB', user='$POSTGRES_USER', password='$POSTGRES_PASSWORD', host='$host'); conn.close();" > /dev/null 2>&1; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

python manage.py makemigrations api

python manage.py migrate

python manage.py load_badges

>&2 echo "Postgres is up - executing command"

# Créer 4 utilisateurs pour le jeu
echo "Création des 4 utilisateurs pour le jeu..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
import os
User = get_user_model()
users_data = [
    {"username": "1", "email": "user1@example.com", "password": "1", "pseudo": "Player1", "ligue_points": 500, "tickets": 10},
    {"username": "2", "email": "user2@example.com", "password": "2", "pseudo": "Player2", "ligue_points": 500, "tickets": 10},
    {"username": "3", "email": "user3@example.com", "password": "3", "pseudo": "Player3", "ligue_points": 500, "tickets": 10},
    {"username": "4", "email": "user4@example.com", "password": "4", "pseudo": "Player4", "ligue_points": 500, "tickets": 10},
]
for user_data in users_data:
    try:
        user = User.objects.get(username=user_data["username"])
        print(f"Utilisateur avec le nom d'utilisateur '{user_data['username']}' existe déjà.")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=user_data["username"],
            email=user_data["email"],
            password=user_data["password"],
            pseudo=user_data["pseudo"],
            ligue_points=user_data["ligue_points"],
			tickets=user_data["tickets"]
        )
        print(f"Utilisateur avec le nom d'utilisateur '{user_data['username']}' créé avec succès.")
EOF
echo "4 utilisateurs créés avec succès !"

exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application