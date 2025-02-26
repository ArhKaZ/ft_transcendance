from django.urls import path, re_path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
	path('add_user/', views.add_user),
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
	path('forfeit_tournament/<str:tournament_code>/', views.forfeit_tournament, name='forfeit_tournament'),
	path('user/profile/<str:userName>/', views.get_info_user),
	path('user/profile/get_history/<str:userName>/', views.get_user_history),
	
	path('tournament_status/<str:tournament_code>/', views.tournament_status, name='tournament_status'),
	path('tournament/<str:tournament_code>/players/', views.get_tournament_players, name='tournament_players'),
	path('tournament/<str:tournament_code>/check_left/', views.check_left, name='check_left'),

	path('tournament/<str:tournament_code>/matches/', views.get_tournament_matches, name='tournament_matches'),
	path('tournament/<str:tournament_code>/get_opponent', views.get_match_opponent, name='tournament_match_opponent'),
	path('tournament/<str:tournament_code>/get_final_opponent', views.get_final_opponent, name='tournament_final_opponent'),
	path('tournament/<str:tournament_code>/final_players/', views.get_final_players, name='get_final_players'),
	path('tournament/<str:tournament_code>/end_players/', views.get_end_players, name='get_end_players'),
	path('tournament/<str:tournament_code>/join_final/', views.join_final, name='join_final'),
	path('tournament/<str:tournament_code>/join_winner/', views.join_winner, name='join_winner'),
]