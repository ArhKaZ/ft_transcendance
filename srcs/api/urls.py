from django.urls import path, re_path
from . import views


urlpatterns = [
	path('add_user/', views.add_user),
	path('login/', views.login_user, name='login_user'),
	path('edit_user_api/', views.edit_user_api),
	path('get_history/', views.get_history),
	path('get-my-info/', views.get_my_info),
	path('logout/', views.logout_user),
	path('erase/', views.erase_user),
	path('add_friend/', views.add_friend),
	path('get_friends/', views.get_friends),
	path('get_pending_friends/', views.get_pending_friends),
	path('join_tournament/', views.join_tournament),
	path('token/refresh/', views.refresh_token),
	path('create_tournament/', views.create_tournament),
	path('quit_tournament/<str:tournament_code>/', views.quit_tournament),
	path('forfeit_tournament/<str:tournament_code>/', views.forfeit_tournament, name='forfeit_tournament'),
    path('record_match/<str:tournament_code>/', views.record_match_blockchain, name='record_match'),
	path('user/profile/<str:userName>/', views.get_info_user),
	path('user/profile/get_history/<str:userName>/', views.get_user_history),
	path('tournament_status/<str:tournament_code>/', views.tournament_status, name='tournament_status'),
	path('tournament/<str:tournament_code>/check_left/', views.check_left, name='check_left'),
	path('tournament/<str:tournament_code>/get_opponent', views.get_match_opponent, name='tournament_match_opponent'),
	path('tournament/<str:tournament_code>/get_final_opponent', views.get_final_opponent, name='tournament_final_opponent'),
	path('tournament/<str:tournament_code>/end_players/', views.get_end_players, name='get_end_players'),
	path('check-online/<str:username>/', views.check_user_online, name='check_user_online'),
	path("oauth_callback/", views.oauth, name="oauth_callback"),
	path("spend_ticket/", views.spend_ticket, name="spend_ticket"),
	path("add_badge/", views.add_badge, name="add_badge"),
	path("list_badge/", views.list_badge, name="list_badge"),
]