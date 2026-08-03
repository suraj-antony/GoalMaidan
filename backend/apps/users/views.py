from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.db.models import Q

from .serializers import RegisterSerializer, OTPVerifySerializer, LoginSerializer, UserSerializer
from .utils import send_otp_email, verify_otp

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.is_email_verified = True
            user.save()
            # send_otp_email(user)
            # return Response({
            #     "message": "OTP sent to email",
            #     "user_id": user.id
            # }, status=status.HTTP_201_CREATED)
            return Response({
                "message": "User created successfully",
                "user_id": user.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            is_valid, msg = verify_otp(user, otp)
            if not is_valid:
                return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

            user.is_email_verified = True
            user.otp_code = None
            user.save()

            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                "tokens": tokens,
                "user": user_data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='100/h', method='POST', block=False))  # Relaxed for dev; change back to '5/15m' for production
    def post(self, request):
        was_limited = getattr(request, 'limited', False)
        if was_limited:
            return Response({"error": "Too many login attempts. Try again later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            user = authenticate(request=request, email=email, password=password)
            if user:
                # if not user.is_email_verified:
                #     send_otp_email(user)
                #     return Response({
                #         "error": "Email not verified. A new OTP has been sent.",
                #         "user_id": user.id
                #     }, status=status.HTTP_403_FORBIDDEN)
                
                tokens = get_tokens_for_user(user)
                user_data = UserSerializer(user).data
                return Response({
                    "tokens": tokens,
                    "user": user_data
                }, status=status.HTTP_200_OK)
                
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        data = request.data
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name']
        if 'language' in data:
            user.language = data['language']
        if 'dark_mode' in data:
            user.dark_mode = data['dark_mode']
        if 'fcm_token' in data:
            user.fcm_token = data['fcm_token']
        if 'area_name' in data and user.role == 'organiser':
            user.area_name = data['area_name']
            
        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = User.objects.all()
        
        # Filter by exact role (e.g. organiser or viewer)
        role = request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
            
        # Search by name or email
        search = request.query_params.get('search') or request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )
            
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
