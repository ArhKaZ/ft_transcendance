from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch
import bleach
import re
import os
import base64
from django.conf import settings
from django.core.validators import MaxLengthValidator, MinLengthValidator
import binascii
from rest_framework import serializers
from .models import MyUser, MatchHistory, TournamentMatch
import bleach
import re
import os
import base64
from django.conf import settings
from django.core.validators import MaxLengthValidator, MinLengthValidator, RegexValidator

class StrongPasswordValidator:
    def __call__(self, password):
        if len(password) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not re.search(r'[A-Z]', password):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'[a-z]', password):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        
        if not re.search(r'\d', password):
            raise serializers.ValidationError("Password must contain at least one digit.")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise serializers.ValidationError("Password must contain at least one special character.")

class SafePseudoValidator:
    def __call__(self, pseudo):
        cleaned_pseudo = bleach.clean(pseudo, strip=True)
        
        if cleaned_pseudo != pseudo:
            raise serializers.ValidationError("Pseudo cannot contain HTML or script tags.")
        if not re.match(r'^[a-zA-Z0-9_-]+$', pseudo):
            raise serializers.ValidationError("Pseudo can only contain letters, numbers, underscores, and hyphens.")

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
        validators=[
            MinLengthValidator(8),
            MaxLengthValidator(128),
            StrongPasswordValidator()
        ]
    )
    
    avatar = BinaryField(required=False, allow_null=True)
    
    class Meta:
        model = MyUser
        fields = ['username', 'password', 'description', 'avatar', 'ligue_points', 'pseudo', 'wins', 'looses']
        extra_kwargs = {
            'username': {
                'validators': [
                    MinLengthValidator(2), 
                    MaxLengthValidator(30),
                    RegexValidator(
                        regex=r'^[a-zA-Z0-9_-]+$', 
                        message='Username can only contain letters, numbers, underscores, and hyphens'
                    )
                ]
            },
            'description': {
                'validators': [MaxLengthValidator(500)]
            },
            'pseudo': {
                'validators': [
                    MinLengthValidator(2), 
                    MaxLengthValidator(30),
                    SafePseudoValidator()
                ]
            },
        }

    def get_avatar_url(self, obj):
        if obj.avatar:
            return f"/api/avatars/{obj.id}/"
        else:
            return "/media/avatars/default.png"
    
    def validate_description(self, value):
        return bleach.clean(value, strip=True)

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
                if isinstance(obj.avatar, str):
                    avatar_bytes = obj.avatar.encode('utf-8')
                else:
                    avatar_bytes = obj.avatar
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

