from django.urls import path
from .views import (
    AutoGenerateFixturesView, ManualFixturesView, FixtureListView,
    MatchResultView, MatchEventListCreateView, FixtureDetailView,
    league_phase_status, generate_knockout_after_league,
)

urlpatterns = [
    path('', FixtureListView.as_view(), name='fixture-list'),
    path('auto-generate/', AutoGenerateFixturesView.as_view(), name='fixture-auto-generate'),
    path('manual/', ManualFixturesView.as_view(), name='fixture-manual'),
    path('league-status/<uuid:tournament_id>/', league_phase_status, name='league-status'),
    path('generate-knockout/<uuid:tournament_id>/', generate_knockout_after_league, name='generate-knockout'),
    path('<uuid:pk>/', FixtureDetailView.as_view(), name='fixture-detail'),
    path('<uuid:pk>/result/', MatchResultView.as_view(), name='fixture-result'),
    path('<uuid:pk>/events/', MatchEventListCreateView.as_view(), name='fixture-events'),
]
