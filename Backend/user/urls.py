from django.urls import path
from . import views

urlpatterns = [
	path('add/', views.addPage),
	path('login/', views.loginPage, name='login'),
	path('edit_user/', views.edit_user, name='edit_user')
]