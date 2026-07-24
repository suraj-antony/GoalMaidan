import uuid
from django.db import models
from apps.tournaments.models import Tournament
from apps.teams.models import Player, Team
from apps.fixtures.models import Fixture

class MatchAward(models.Model):
    AWARD_CHOICES = (
        ('man_of_match', 'Man of the Match'),
        ('best_player', 'Best Player'),
        ('best_defender', 'Best Defender'),
        ('best_goalkeeper', 'Best Goalkeeper'),
        ('emerging_player', 'Emerging Player'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fixture = models.ForeignKey(Fixture, on_delete=models.CASCADE, related_name='awards')
    player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL, null=True, blank=True)
    player_name = models.CharField(max_length=100, blank=True)
    award_type = models.CharField(max_length=30, choices=AWARD_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        name = self.player_name or (self.player.name if self.player else 'Unknown')
        return f"{self.award_type} - {name}"

class TournamentAward(models.Model):
    AWARD_CHOICES = (
        ('top_scorer', 'Top Scorer'),
        ('top_assist', 'Top Assist'),
        ('best_player', 'Best Player'),
        ('best_defender', 'Best Defender'),
        ('best_goalkeeper', 'Best Goalkeeper'),
        ('emerging_player', 'Emerging Player'),
        ('fair_play', 'Fair Play Team'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='tournament_awards')
    player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True)
    player_name = models.CharField(max_length=200, blank=True, default='')  # free-text winner name
    team_name = models.CharField(max_length=200, blank=True, default='')    # free-text team name
    award_type = models.CharField(max_length=20, choices=AWARD_CHOICES)

    class Meta:
        # Only one award of each type per tournament
        unique_together = [('tournament', 'award_type')]

    def __str__(self):
        name = self.player_name or (self.player.name if self.player else '—')
        return f"{self.award_type} - {name}"

class LeagueTable(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    played = models.IntegerField(default=0)
    won = models.IntegerField(default=0)
    drawn = models.IntegerField(default=0)
    lost = models.IntegerField(default=0)
    goals_for = models.IntegerField(default=0)
    goals_against = models.IntegerField(default=0)
    points = models.IntegerField(default=0)
    goal_difference = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        self.goal_difference = self.goals_for - self.goals_against
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-points', '-goal_difference', '-goals_for']

    def __str__(self):
        return f"{self.team.name} - {self.points} pts"
