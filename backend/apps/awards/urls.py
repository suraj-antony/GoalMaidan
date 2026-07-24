from django.urls import path
from .views import (
    MatchAwardView, TournamentAwardView,
    tournament_top_scorers, tournament_top_assists, tournament_goal_contributions,
    tournament_league_table, tournament_all_stats,
    MatchAwardsListView, TournamentAwardsListView
)

urlpatterns = [
    # General awards creation
    path('match/', MatchAwardView.as_view(), name='match-award'),
    path('tournament/', TournamentAwardView.as_view(), name='tournament-award'),
    
    # Stats (mapped from /api/stats/ in main urls.py)
    path('<uuid:tournament_id>/top-scorers/', tournament_top_scorers, name='top-scorers'),
    path('<uuid:tournament_id>/top-assists/', tournament_top_assists, name='top-assists'),
    path('<uuid:tournament_id>/goal-contributions/', tournament_goal_contributions, name='goal-contributions'),
    path('<uuid:tournament_id>/league-table/', tournament_league_table, name='league-table'),
    path('<uuid:tournament_id>/match-awards/', MatchAwardsListView.as_view(), name='match-awards-list'),
    path('<uuid:tournament_id>/tournament-awards/', TournamentAwardsListView.as_view(), name='tournament-awards-list'),
    path('<uuid:tournament_id>/all/', tournament_all_stats, name='all-stats'),
]
