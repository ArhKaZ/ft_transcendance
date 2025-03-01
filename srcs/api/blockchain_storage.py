import os
import sys
import traceback
from django.http import JsonResponse
from eth_account import Account
from web3 import Web3
# from web3.middleware import SignAndSendR
from web3.middleware import SignAndSendRawMiddlewareBuilder
from web3 import middleware
from logging import getLogger
import asyncio
import time


#This module doesn't require a lot of code but necessitates a quite a lot of notional knowledge about what we call the blockchain.
#The blockchain is a decentralized database that stores all the transactions that have been made on it. It is a chain of blocks, each block containing a list of transactions.
#Here, we're using Sepolia Network which is one of the many Ethereum Testnets that exists
#The process is quite simple. We connect to the Ethereum node, then we connect to the contract that we want to interact with.
#We deploy a Smart Contract with the Remix IDE, who help us to write, compile and deploy the contract instead of installing redhat and compiling the smart Contract ourselves in a docker.
#We authenticate with our private key and the contract address. We then call the smart contract's functions with the right parameters to have the data wrote when watching the transactions with etherscan.

if (os.getenv('INFURA_API_KEY') and os.getenv('META_PRIV_KEY') and os.getenv('CONTRACT_ADRS')) and os.getenv('ABI'):

	abi = os.getenv('ABI')
	#Connect to the Ethereum node
	sepolia_key = os.getenv('INFURA_API_KEY')
	private_key = os.getenv('META_PRIV_KEY')


	#Get contract address
	contractAddress = Web3.to_checksum_address(os.getenv('CONTRACT_ADRS'))


	#Get and connect metamask account
	web3 = Web3(Web3.HTTPProvider(sepolia_key))
	account = Account.from_key(private_key)


	web3.middleware_onion.inject(SignAndSendRawMiddlewareBuilder.build(account), layer=0)
	
	#Connect account to the contract

	admin_acc = account.address
	contract = web3.eth.contract(address=contractAddress, abi=abi)
	print("TEST", admin_acc, contract, web3)
else :
	print("Error : Missing environment variables for web3", file=sys.stderr)
	account = None
	admin_acc = None
	contract = None

#Record match on the blockchain

def record_match(tournament_data, tournament_code):
	print("Recording match", file=sys.stderr)
	try :
		winner = str(tournament_data["winner"])
		print("ALEDDDDDDDDDDDDDDDDd", winner)
		token_hash = contract.functions.storeTournament(tournament_code, tournament_data["players"], tournament_data["finalists"], winner).transact({'from' : admin_acc})
		receipt = web3.eth.wait_for_transaction_receipt(token_hash)
		if (receipt.status == 1):
			print("Match enregistre avec succes", file=sys.stderr)
			print_etherscan_link(token_hash)
		else:
			print("Error lors de l'enregistrement du match", file=sys.stderr)
	except Exception as e:
		error = "Error recording match, type of error :\n" + f"{type(e).__name__}\n" + f"Error message :\n {str(e)}\n" + "\n Traceback : \n" + traceback.format_exc()
		print(error, file=sys.stderr)
	return None

def return_etherscan_link(token_hash):
	return "https://sepolia.etherscan.io/tx/0x" + token_hash.hex()

def print_etherscan_link(token_hash):
	printer = "https://sepolia.etherscan.io/tx/0x" + token_hash.hex()
	print("Voici le lien vers la transaction : " + printer, file=sys.stderr)
