import asyncio
import websockets
import requests
import json
import argparse
import os

BASE_URL = "http://localhost:8000/onlinePong/api/"
WS_URL = "ws://localhost:8000/ws/onlinePong"
TOKEN_FILE = ".pong_token"

# def login(username, password):
#     response = requests.post(f"{BASE_URL}cli/login", json={
#         "username": username,
#         "password": password
#     })
#     if response.status_code == 200:
#         data = response.json()
#         with open(TOKEN_FILE, 'w') as f:
#             json.dump(data, f)
#         print("Login successful")
#         return data['access']
#     else:
#         print(f"Login failed: {response.status_code} - {response.text}")
#         return None
#
# def get_token():
#     if os.path.exists(TOKEN_FILE):
#         with open(TOKEN_FILE, 'r') as f:
#             data = json.load(f)
#             return data['access']
#     return None
#
# def create_or_join_game():
#     token = get_token()
#     if not token:
#         print("You need to login first")
#         return None, None
#
#     headers = {'Authorization': f'Bearer {token}'}
#     response = requests.post(f"{BASE_URL}cli/create_or_join_game", headers=headers)
#     if response.status_code == 200:
#         game_data = response.json()
#         print(f"Joined game. Game ID: {game_data['game_id']}")
#         return game_data['game_id'], game_data['player1'] if game_data['player1_is_me'] else game_data['player2']
#     else:
#         print("Failed to join game.")
#         return None, None
#
# def get_player_info():
#     token = get_token()
#     if not token:
#         print("You need to login first")
#         return
#
#     headers = {'Authorization': f'Bearer {token}'}
#     response = requests.get(f"{BASE_URL}cli/get_player", headers=headers)
#     if response.status_code == 200:
#         player_data = response.json()
#         print(f"Your ID: {player_data['id']}")
#         print(f"Your username: {player_data['username']}")
#         print(f"Your avatar: {player_data['src_avatar']}")
#     else:
#         print("Failed to get player information.")
#
# async def websocket_client(game_id, player_id):
#     uri = f"{WS_URL}/{game_id}/{player_id}"
#     async with websockets.connect(uri) as websocket:
#         print(f"Connected to game {game_id}")
#
#         await websocket.send(json.dumps({
#             "action": "ready",
#             "player_id": player_id,
#         }))
#
#         try:
#             while True:
#                 message = await websocket.recv()
#                 data = json.loads(message)
#
#                 if data.get('type') == 'player_ready':
#                     print(f"Player {data['player_id']} is ready.")
#                 elif data.get('message') == 'game_start':
#                     print("Game as started!")
#                 elif data.get('type') == 'ball_position':
#                     print(f"Ball position: x={data['x']:.2f}, y={data['y']:.2f}")
#                 elif data.get('type') == 'score_update':
#                     print(f"Score update: {data['score']}")
#                 elif data.get('type') == "game_finish":
#                     print(f"Game finished: Winner: {data['winning_session']}")
#                     break
#
#         except websocket.exceptions.ConnectionClosed:
#             print("Connection to the server was closed.")
#
#
# def main():
#    parser = argparse.ArgumentParser(description="Pong CLI Client")
#    parser.add_argument("--login", action="store_true", help="Login to the game")
#    parser.add_argument("--username", help="Username for login")
#    parser.add_argument("--password", help="Password for login")
#    args = parser.parse_args()
#
#    if args.login:
#        if not args.username or not args.password:
#            print("Both username and password are required")
#            return
#        login(args.username, args.password)
#    else:
#        get_player_info()
#        game_id, player_id = create_or_join_game()
#        if game_id and player_id:
#            asyncio.get_event_loop().run_until_complete(websocket_client(game_id, player_id))

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