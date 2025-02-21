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
	path('logout/', views.logout_user),
	path('erase/', views.erase_user),
	path('add_friend/', views.add_friend),
	path('get_friends/', views.get_friends),
	path('get_pending_friends/', views.get_pending_friends),
    path('change_lp/', views.change_lp),
	path('join_tournament/', views.join_tournament),
	path('create_tournament/', views.create_tournament),
	path('quit_tournament/<str:tournament_code>/', views.quit_tournament),
	
	path('tournament_status/<str:tournament_code>/', views.tournament_status, name='tournament_status'),
	path('tournament/<str:tournament_code>/players/', views.get_tournament_players, name='tournament_players'),
	path('tournament/<str:tournament_code>/matches/', views.get_tournament_matches, name='tournament_matches'),
    path('tournament/<str:tournament_code>/get_opponent', views.get_match_opponent, name='tournament_match_opponent'),
]