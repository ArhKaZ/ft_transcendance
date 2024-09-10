from rest_framework.response import Response
from django.shortcuts import render

def addPage(request):
    return render(request, "user/add.html")
