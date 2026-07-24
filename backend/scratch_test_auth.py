import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'football_app.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model

User = get_user_model()

email = 'surajantony26@gmail.com'
password = input("Enter the password you are using to login: ")

try:
    user = User.objects.get(email=email)
    print(f"\nUser found:")
    print(f"  Email: {user.email}")
    print(f"  Is Active: {user.is_active}")
    print(f"  Is Staff: {user.is_staff}")
    print(f"  Is Superuser: {user.is_superuser}")
    print(f"  Is Email Verified: {user.is_email_verified}")
    print(f"  Password in DB (hashed): {user.password}")
    
    # Test authentication
    authenticated_user = authenticate(email=email, password=password)
    print(f"\nAuthentication test (without request): {authenticated_user}")
    
    authenticated_user_with_req = authenticate(request=None, email=email, password=password)
    print(f"Authentication test (with request=None): {authenticated_user_with_req}")
    
    # Try checking password directly
    password_correct = user.check_password(password)
    print(f"Direct password check (user.check_password): {password_correct}")
    
    if not password_correct:
        print("\n--> The password you entered does NOT match the hashed password in the database!")
        change = input("Would you like to reset this user's password to 'password123'? (yes/no): ")
        if change.lower().strip() == 'yes':
            user.set_password('password123')
            user.save()
            print("Password successfully reset to: password123")
            print("Please try authenticating again now.")
except User.DoesNotExist:
    print(f"User with email '{email}' does not exist in the database.")
