import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

GROUND_TYPE_CHOICES = [
    ('3s', '3-a-side'),
    ('5s', '5-a-side'),
    ('6s', '6-a-side'),
    ('7s', '7-a-side'),
    ('9s', '9-a-side'),
    ('11s', '11-a-side'),
]

AGE_CATEGORY_CHOICES = [
    ('U7', 'Under 7'), ('U8', 'Under 8'), ('U9', 'Under 9'),
    ('U10', 'Under 10'), ('U11', 'Under 11'), ('U12', 'Under 12'),
    ('U13', 'Under 13'), ('U14', 'Under 14'), ('U15', 'Under 15'),
    ('U16', 'Under 16'), ('U17', 'Under 17'), ('U18', 'Under 18'),
    ('U19', 'Under 19'), ('U20', 'Under 20'), ('U21', 'Under 21'),
    ('U22', 'Under 22'), ('U23', 'Under 23'),
    ('Open', 'Open'), ('Veterans', 'Veterans (40+)'),
]

TOURNAMENT_TYPE_CHOICES = [
    ('league', 'League Only'),
    ('knockout', 'Knockout Only'),
    ('league_knockout', 'League + Knockout'),
]

STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('active', 'Active'),
    ('completed', 'Completed'),
]

class Tournament(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organiser = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tournaments')
    name = models.CharField(max_length=200)
    area_name = models.CharField(max_length=200, default="")
    ground_type = models.CharField(max_length=10, choices=GROUND_TYPE_CHOICES)
    age_category = models.CharField(max_length=10, choices=AGE_CATEGORY_CHOICES)
    tournament_type = models.CharField(max_length=20, choices=TOURNAMENT_TYPE_CHOICES)

    # Format options
    home_and_away = models.BooleanField(default=False)  # League: play twice
    knockout_qualifiers = models.IntegerField(default=4)  # How many qualify from league to KO
    max_teams = models.IntegerField(default=8)
    third_place_option = models.BooleanField(default=False)


    # Age verification
    age_verification_required = models.BooleanField(default=False)
    accept_aadhaar = models.BooleanField(default=False)
    accept_school_certificate = models.BooleanField(default=False)
    accept_birth_certificate = models.BooleanField(default=False)

    # Access
    public_stats = models.BooleanField(default=True)
    is_private = models.BooleanField(default=False)
    verification_link_token = models.CharField(max_length=100, unique=True, blank=True)

    # Awards config — stored as JSON
    awards_config = models.JSONField(default=dict)

    # Stats config — stored as JSON
    stats_config = models.JSONField(default=dict)

    # Team names — stored as JSON array of strings
    # e.g. ["Red Eagles", "Blue Stars", "Gold Rovers", ""]
    team_names_list = models.JSONField(default=list, blank=True)

    # Fixture generation mode: 'auto' or 'manual'
    fixture_generation_mode = models.CharField(
        max_length=10,
        choices=[('auto', 'Auto Generate'), ('manual', 'Manual Entry')],
        default='auto'
    )

    # League+Knockout sub-style: 'multi_group' or 'single_group'
    league_knockout_style = models.CharField(
        max_length=20,
        choices=[('multi_group', 'Multi Group'), ('single_group', 'Single Group')],
        blank=True, null=True
    )

    # Multi-group settings
    num_groups = models.IntegerField(default=4, null=True, blank=True)
    qualifiers_per_group = models.IntegerField(default=2, null=True, blank=True)

    # Tracks whether fixtures have been auto-generated
    fixtures_generated = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    activated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-generate verification token if not set
        if not self.verification_link_token:
            self.verification_link_token = str(uuid.uuid4())
        # If Open or Veterans, force age_verification_required = False
        if self.age_category in ['Open', 'Veterans']:
            self.age_verification_required = False
            self.accept_aadhaar = False
            self.accept_school_certificate = False
            self.accept_birth_certificate = False
        super().save(*args, **kwargs)

    @property
    def teams(self):
        return self.team_set

    @property
    def fixtures(self):
        return self.fixture_set

    def __str__(self):
        return f"{self.name} ({self.ground_type} - {self.age_category})"


class TournamentGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='groups')
    name = models.CharField(max_length=10)  # 'A', 'B', 'C', etc.
    teams = models.ManyToManyField('teams.Team', blank=True, related_name='groups')

    def __str__(self):
        return f"Group {self.name} — {self.tournament.name}"

