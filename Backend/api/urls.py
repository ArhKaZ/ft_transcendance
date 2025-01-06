from django.urls import path, re_path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
	path('add_user/', views.add_user),
	path('list_users/', views.list_users),
    path('login/', views.login_user, name='login_user'),
	path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
	path('edit_user_api/', views.edit_user_api),
	path('add_match/', views.add_match),
	path('get_history/', views.get_history),
	path('get-my-info/', views.get_my_info),
]