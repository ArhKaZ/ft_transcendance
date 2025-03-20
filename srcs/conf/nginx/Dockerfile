FROM nginx:latest

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY generate_certs.sh /docker-entrypoint.d/40-generate_certs.sh

RUN chmod +x /docker-entrypoint.d/40-generate_certs.sh