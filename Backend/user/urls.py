from django.urls import path
from . import views

urlpatterns = [
	path('add/', views.addPage),
	path('login/', views.loginPage)
]