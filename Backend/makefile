NAME	=	./docker-compose.yml 

start:
		clear && \
		docker compose -f $(NAME) down && \
		docker compose -f $(NAME) up --build 

logs:
		docker compose -f $(NAME) logs --follow 

clear:
		docker compose -f $(NAME) down -v

PHONY: start stop logs clear