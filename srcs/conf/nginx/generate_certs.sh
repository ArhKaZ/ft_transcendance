#!/bin/sh

SSL_DIR="/etc/ssl/certs"

# Créer le dossier si nécessaire
mkdir -p $SSL_DIR

# Vérifier si les fichiers existent déjà
if [ ! -f "${SSL_DIR}/fullchain.pem" ] || [ ! -f "${SSL_DIR}/privkey.pem" ]; then
    echo "🔑 Génération des certificats SSL auto-signés..."

    # Générer la clé privée et le certificat
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${SSL_DIR}/privkey.pem" \
        -out "${SSL_DIR}/fullchain.pem" \
        -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"

    # Vérifier que les fichiers ont été créés
    if [ -f "${SSL_DIR}/fullchain.pem" ] && [ -f "${SSL_DIR}/privkey.pem" ]; then
        echo "✅ Certificats SSL générés avec succès :"
        echo "   - ${SSL_DIR}/fullchain.pem"
        echo "   - ${SSL_DIR}/privkey.pem"
    else
        echo "❌ Erreur : Les fichiers de certificats n'ont pas été générés."
        exit 1
    fi
else
    echo "✅ Certificats SSL déjà présents :"
    echo "   - ${SSL_DIR}/fullchain.pem"
    echo "   - ${SSL_DIR}/privkey.pem"
fi