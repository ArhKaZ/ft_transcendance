from rest_framework import serializers
from .models import MyUser

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = MyUser
        fields = ['username', 'password', 'description']
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = MyUser(**validated_data)
        if password:
            user.set_password(password)  # Hash the password
        user.save()
        return user

