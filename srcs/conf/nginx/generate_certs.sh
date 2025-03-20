#!/bin/sh

SSL_DIR="/etc/ssl/certs"

if [ ! -f "${SSL_DIR}/fullchain.pem" ] || [ ! -f "${SSL_DIR}/privkey.pem" ]; then
	echo "🔑 Génération des certificats SSL auto-signés..."
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout "${SSL_DIR}/privkey.pem" \
		-out "${SSL_DIR}/fullchain.pem" \
		-subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"

fi