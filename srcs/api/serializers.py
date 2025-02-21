from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch

class UserSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True)
	class Meta:
		model = MyUser
		fields = ['username', 'password', 'description', 'avatar', 'ligue_points', 'pseudo']
		extra_kwargs = {'password': {'write_only': True}}
	def create(self, validated_data):
		password = validated_data.pop('password', None)
		validated_data['ligue_points'] = 500
		user = MyUser(**validated_data)
		if password:
			user.set_password(password)  # Hash the password
		user.save()
		return user

class MatchHistorySerializer(serializers.ModelSerializer):
	class Meta:
		model = MatchHistory
		fields = ['id', 'type', 'opponent_name', 'date', 'won']

class UserInfoSerializer(serializers.ModelSerializer):
	class Meta:
		model = MyUser
		fields = ['id', 'username', 'description', 'avatar', 'ligue_points', 'pseudo']

class TournamentMatchSerializer(serializers.ModelSerializer):
	player1 = UserInfoSerializer()
	player2 = UserInfoSerializer()
	winner = UserInfoSerializer(allow_null=True)

	class Meta:
		model = TournamentMatch
		fields = ['id', 'player1', 'player2', 'score', 'winner', 'is_final']

from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch, Tournament

class TournamentSerializer(serializers.ModelSerializer):
	players = UserInfoSerializer(many=True, read_only=True)
	finalist = UserInfoSerializer(many=True, read_only=True)
	winner = UserInfoSerializer(many=True, read_only=True)

	class Meta:
		model = Tournament
		fields = ['code', 'players', 'finalist', 'winner', 'started']

