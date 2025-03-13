from cryptography.hazmat.primitives.twofactor import InvalidToken
from django.core.exceptions import ValidationError
from django.shortcuts import render
from rest_framework.decorators import api_view
from django.http import HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from rest_framework.authtoken.models import Token
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication

def index(request):
	return render(request, 'index.html')



































