import asyncio
import websockets
import requests
import json
import argparse
import os

BASE_URL = "http://localhost:8000/onlinePong/api/"
WS_URL = "ws://localhost:8000/ws/onlinePong"

def get_info_game(game_id):
    response = requests.get(f"{BASE_URL}cli/get_info_game?game_id={game_id}")
    if response.status_code == 200:
        games_info = response.json()
        print(f"Info of game {games_info['game_id']}:")
        print(f"Status: {games_info['status']}")
        print(f"Players: {games_info['player1']} vs {games_info['player2']}")
        print(f"Score: {games_info['score']}")
    else:
        print(f'Error getting info of game {game_id}: {response.status_code}')

def get_all_game():
    response = requests.get(f"{BASE_URL}cli/get_all_game")
    if response.status_code == 200:
        games = response.json()
        print("All games currently created :")
        for game in games:
            print(f"Game : {game['game_id']} is {game['status']}")
    else :
        print(f'Error getting all games : {response.status_code}')

def main():
    parser = argparse.ArgumentParser(
        prog='CLI_PongSupervisor',
        description='Get info from the cache of the Online Pong.'
    )
    parser.add_argument('--allGames', action='store_true', help='Display all games currently created.')
    parser.add_argument('--InfoGame', action='store_true', help='Display details of a game. Need GID flag')
    parser.add_argument('--GID', type=str, help='ID of the game.')
    args = parser.parse_args()
    if args.allGames:
        get_all_game()
        return
    elif args.InfoGame:
        if not args.GID:
            print('Please specify a game ID.')
            return
        else:
            get_info_game(args.GID)
            return

if __name__ == "__main__":
    main()