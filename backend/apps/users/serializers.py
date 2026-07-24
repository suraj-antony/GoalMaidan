from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'role', 'area_name', 'language', 'dark_mode', 'is_email_verified', 'fcm_token')
        read_only_fields = ('id', 'email', 'role', 'is_email_verified')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('name', 'email', 'password', 'role', 'area_name', 'language')

    def validate(self, data):
        if data.get('role') == 'organiser' and not data.get('area_name'):
            raise serializers.ValidationError({"area_name": "Area name is required for organisers."})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            role=validated_data['role'],
            area_name=validated_data.get('area_name', ''),
            language=validated_data.get('language', 'en')
        )
        return user

class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
