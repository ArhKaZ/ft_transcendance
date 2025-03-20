NAME	=	./docker-compose.yml 

start:
		clear && \
		docker compose -f $(NAME) down && \
		docker compose -f $(NAME) up --build 

logs:
		docker compose -f $(NAME) logs --follow django

clear:
		docker compose -f $(NAME) down -v

fclear:
		docker compose -f $(NAME) down -v --remove-orphans && \
		docker system prune -a --volumes -f && \
		find ./srcs/media/avatars/ -mindepth 1 ! -name "default.png" ! -name "friendico.png" ! -name "ia.png" -exec rm -rf {} +

re:	fclear start

PHONY: start stop logs clear fclear
