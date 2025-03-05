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

>&2 echo "Postgres is up - executing command"

# Démarrer Daphne
exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application
