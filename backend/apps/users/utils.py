import random
from django.core.mail import send_mail
from django.utils import timezone

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(user):
    otp = generate_otp()
    user.otp_code = otp
    user.otp_created_at = timezone.now()
    user.save()
    send_mail(
        subject='TourneyFC — Your verification code',
        message=f'Your OTP is: {otp}\n\nThis code expires in 10 minutes.',
        from_email='noreply@tourneyfc.app',
        recipient_list=[user.email],
    )

def verify_otp(user, otp):
    if user.otp_code != otp:
        return False, 'Invalid OTP'
    
    # Check expiry (10 mins = 600 seconds)
    if not user.otp_created_at:
        return False, 'OTP expired'
        
    elapsed = (timezone.now() - user.otp_created_at).total_seconds()
    if elapsed > 600:
        return False, 'OTP expired'
    return True, 'OK'
