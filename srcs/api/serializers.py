from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch
import bleach
import re

class UserSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True)
	class Meta:
		model = MyUser
		fields = ['username', 'password', 'description', 'avatar', 'ligue_points', 'pseudo', 'wins', 'looses']
		extra_kwargs = {'password': {'write_only': True}}
	
	def validate_username(self, value):
		return self.validate_text_field(value, "username")

	def validate_pseudo(self, value):
		return self.validate_text_field(value, "pseudo")

	def validate_description(self, value):
		return self.validate_text_field(value, "description")

	def validate_text_field(self, value, field_name):
		if not re.match(r'^[a-zA-Z0-9 ,.\s]+$', value):
			raise serializers.ValidationError(f"Le champ {field_name} ne peut contenir que des lettres, chiffres, espaces, virgules et points.")
		return value

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
		fields = ['id', 'username', 'description', 'avatar', 'ligue_points', 'pseudo', 'wins', 'looses']

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

