NAME	=	./srcs/docker-compose.yml 

start:
		clear && \
		docker compose -f $(NAME) down && \
		docker compose -f $(NAME) up --build 

logs:
		docker compose -f $(NAME) logs --follow 

clear:
		docker compose -f $(NAME) down -v

fclear:
		docker compose -f $(NAME) down -v --remove-orphans && \
		docker system prune -a --volumes -f

PHONY: start stop logs clear fclear
