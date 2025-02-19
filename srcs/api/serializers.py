from rest_framework import serializers
from .models import MyUser
from .models import MatchHistory

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
