from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch
import bleach
import re
import os
import base64
from django.conf import settings
from django.core.validators import MaxLengthValidator, MinLengthValidator


class BinaryField(serializers.Field):
	def to_representation(self, value):
		if value is None:
			return None
		return base64.b64encode(value).decode('utf-8')

	def to_internal_value(self, data):
		if isinstance(data, bytes):
			return data
		elif isinstance(data, str):
			try:
				return base64.b64decode(data)
			except (TypeError, binascii.Error):
				raise serializers.ValidationError("Invalid base64 string")
		else:
			raise serializers.ValidationError("Invalid data type for binary field")


class UserSerializer(serializers.ModelSerializer):
	password = serializers.CharField(
		write_only=True,
		validators=[MinLengthValidator(8), MaxLengthValidator(128)]  # Example: Password length between 8 and 128 characters
	)
	
	avatar = BinaryField(required=False, allow_null=True)  # Add this line
	
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

	def get_avatar_url(self, obj):
		if obj.avatar:
			return f"/api/avatars/{obj.id}/"  # URL to fetch the avatar
		else:
			return "/media/avatars/default.png"  # Default avatar URL
	
	def validate_description(self, value):
		return bleach.clean(value)

	def create(self, validated_data):
		password = validated_data.pop('password', None)
		validated_data['ligue_points'] = 500
		if 'avatar' not in validated_data:
			default_path = os.path.join(settings.MEDIA_ROOT, 'avatars/default.png')
			try:
				with open(default_path, 'rb') as f:
					validated_data['avatar'] = f.read()
			except FileNotFoundError:
				validated_data['avatar'] = None
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
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = MyUser
        fields = ['id', 'username', 'description', 'avatar', 'ligue_points', 'pseudo', 'wins', 'looses']

    def get_avatar(self, obj):
        if obj.avatar:
            try:
                # Ensure the avatar is treated as bytes
                if isinstance(obj.avatar, str):
                    # If the avatar is a string (e.g., from the database), convert it to bytes
                    avatar_bytes = obj.avatar.encode('utf-8')
                else:
                    avatar_bytes = obj.avatar
                # Encode the binary data to base64
                avatar_base64 = base64.b64encode(avatar_bytes).decode('utf-8')
                return f"data:image/png;base64,{avatar_base64}"
            except Exception as e:
                print(f"Error encoding avatar for user {obj.username}: {e}")
                return None
        return None

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

