#!/bin/bash

set -e

host="$1"
shift
cmd="$@"

# Loop until we can connect to the database
until python -c "import psycopg2; conn = psycopg2.connect(dbname='$POSTGRES_DB', user='$POSTGRES_USER', password='$POSTGRES_PASSWORD', host='$host'); conn.close();" > /dev/null 2>&1; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

python manage.py makemigrations api # bizarre mais necessaire

python manage.py migrate

>&2 echo "Postgres is up - executing command"

# Créer un super utilisateur si nécessaire
echo "Création du super utilisateur..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.exceptions import ObjectDoesNotExist
import os

User = get_user_model()
username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'pwd')

try:
 User.objects.get(username=username)
 print(f"Super utilisateur avec le nom d'utilisateur '{username}' existe déjà.")
except ObjectDoesNotExist:
 User.objects.create_superuser(username=username, email=email, password=password)
 print(f"Super utilisateur avec le nom d'utilisateur '{username}' créé avec succès.")
EOF

echo "Super utilisateur créé avec succès !"

exec python manage.py runserver 0.0.0.0:8000