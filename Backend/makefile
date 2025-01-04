NAME	=	./docker-compose.yml 

start:
		clear && docker-compose -f $(NAME) down &&  docker-compose -f $(NAME) up --build

clear:
		docker-compose -f $(NAME) down -v

PHONY: start stop