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

exec python manage.py runserver 0.0.0.0:8000