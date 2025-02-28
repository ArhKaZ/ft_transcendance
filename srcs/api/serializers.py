from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch
import bleach
import re
from django.core.validators import MaxLengthValidator, MinLengthValidator

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[MinLengthValidator(8), MaxLengthValidator(128)]  # Example: Password length between 8 and 128 characters
    )
    
    class Meta:
        model = MyUser
        fields = ['username', 'password', 'description', 'avatar', 'ligue_points', 'pseudo', 'wins', 'looses']
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {
                'validators': [MinLengthValidator(3), MaxLengthValidator(30)]  # Example: Username length between 3 and 30 characters
            },
            'description': {
                'validators': [MaxLengthValidator(500)]  # Example: Description max length of 500 characters
            },
            'pseudo': {
                'validators': [MinLengthValidator(2), MaxLengthValidator(20)]  # Example: Pseudo length between 2 and 20 characters
            },
        }
    
    def validate_description(self, value):
        return bleach.clean(value)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data['ligue_points'] = 500
        user = MyUser(**validated_data)
        if password:
            user.set_password(password)
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

