import os
import sys
import traceback
from django.http import JsonResponse
from eth_account import Account
from web3 import Web3
from web3.middleware import SignAndSendRawMiddlewareBuilder
from web3 import middleware
from logging import getLogger
import asyncio
import time



if (os.getenv('INFURA_API_KEY') and os.getenv('META_PRIV_KEY') and os.getenv('CONTRACT_ADRS')) and os.getenv('ABI'):

	abi = os.getenv('ABI')
	
	sepolia_key = os.getenv('INFURA_API_KEY')
	private_key = os.getenv('META_PRIV_KEY')
	contractAddress = Web3.to_checksum_address(os.getenv('CONTRACT_ADRS'))
	web3 = Web3(Web3.HTTPProvider(sepolia_key))
	account = Account.from_key(private_key)
	web3.middleware_onion.inject(SignAndSendRawMiddlewareBuilder.build(account), layer=0)
	admin_acc = account.address
	contract = web3.eth.contract(address=contractAddress, abi=abi)
else :
	print("Error : Missing environment variables for web3", file=sys.stderr)
	account = None
	admin_acc = None
	contract = None

async def record_match(tournament_data, tournament_code):
	print("Recording match", file=sys.stderr)
	try :
		winner = str(tournament_data["winner"])
		token_hash = contract.functions.storeTournament(tournament_code, tournament_data["players"], tournament_data["finalists"], winner).transact({'from' : admin_acc})
		receipt = web3.eth.wait_for_transaction_receipt(token_hash)
		if (receipt.status == 1):
			print("Match successfully recorded", file=sys.stderr)
			print_etherscan_link(token_hash)
		else:
			print("Error during match recording", file=sys.stderr)
	except Exception as e:
		error = "Error recording match, type of error :\n" + f"{type(e).__name__}\n" + f"Error message :\n {str(e)}\n" + "\n Traceback : \n" + traceback.format_exc()
		print(error, file=sys.stderr)
	return None

def return_etherscan_link(token_hash):
	return "https://sepolia.etherscan.io/tx/0x" + token_hash.hex()

def print_etherscan_link(token_hash):
	printer = "https://sepolia.etherscan.io/tx/0x" + token_hash.hex()
	print("Here is the link to the transaction : " + printer, file=sys.stderr)
