import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.tournaments.models import Tournament

User = get_user_model()

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    manager_name = models.CharField(max_length=255)
    manager_phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Player(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    dob = models.DateField(null=True, blank=True)
    age_certificate_url = models.CharField(max_length=500, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    rejection_reason = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ViewerAccessRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    viewer = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.viewer.name} - {self.tournament.name} ({self.status})"
