from rest_framework import serializers
from .models import MyUser
from .models import MatchHistory

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = MyUser
        fields = ['username', 'password', 'description', 'avatar']
        extra_kwargs = {'password': {'write_only': True}}
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = MyUser(**validated_data)
        if password:
            user.set_password(password)  # Hash the password
        user.save()
        return user
    
class MatchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchHistory
        fields = ['id', 'opponent_name', 'date', 'won']

class UserInfoSerializer(serializers.ModelSerializer):
	class Meta:
		model = MyUser
		fields = ['username', 'description', 'avatar']
