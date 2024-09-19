from django.urls import path, re_path
from . import views


urlpatterns = [
	path('add_user/', views.add_user),
	path('list_users/', views.list_users),
]