import uuid
from django.db import models
from apps.tournaments.models import Tournament
from apps.teams.models import Team, Player

class Fixture(models.Model):
    STAGE_CHOICES = (
        ('league', 'League'),
        ('group', 'Group'),
        ('group_a', 'Group A'), ('group_b', 'Group B'), ('group_c', 'Group C'),
        ('group_d', 'Group D'), ('group_e', 'Group E'), ('group_f', 'Group F'),
        ('group_g', 'Group G'), ('group_h', 'Group H'),
        ('round_of_16', 'Round of 16'),
        ('quarter', 'Quarter Final'),
        ('semi', 'Semi Final'),
        ('third_place', 'Third Place'),
        ('final', 'Final'),
    )
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('completed', 'Completed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    team_a = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='fixtures_as_a', null=True, blank=True)
    team_b = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='fixtures_as_b', null=True, blank=True)
    match_date = models.DateField(null=True, blank=True)
    match_time = models.TimeField(null=True, blank=True)
    venue = models.CharField(max_length=255, null=True, blank=True)
    score_a = models.IntegerField(default=0)
    score_b = models.IntegerField(default=0)
    penalty_score_a = models.IntegerField(null=True, blank=True)
    penalty_score_b = models.IntegerField(null=True, blank=True)
    winner = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_fixtures')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    round_number = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        ta = self.team_a.name if self.team_a else "TBD"
        tb = self.team_b.name if self.team_b else "TBD"
        return f"{ta} vs {tb} ({self.stage})"

class MatchEvent(models.Model):
    EVENT_CHOICES = (
        ('goal', 'Goal'),
        ('assist', 'Assist'),
        ('yellow_card', 'Yellow Card'),
        ('red_card', 'Red Card'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fixture = models.ForeignKey(Fixture, on_delete=models.CASCADE, related_name='events')
    player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL, null=True, blank=True)
    player_name = models.CharField(max_length=100, blank=True)
    team = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    minute = models.IntegerField(default=0, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.player_name or (self.player.name if self.player else 'Unknown')
        return f"{self.event_type} — {name} ({self.minute}')"
