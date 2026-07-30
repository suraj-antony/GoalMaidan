from django.urls import path
from .views import (
    TournamentListCreateView, MyTournamentsView, TournamentDetailView,
    TournamentPublishView, TournamentCompleteView, TournamentSearchView,
    ViewerDashboardView, TournamentActivateView, TournamentCheckCompleteView,
    TournamentReopenView, TournamentGroupsListView, TournamentGroupAssignView,
    TournamentGroupGenerateView, TournamentGroupFixturesView,
    TournamentGenerateFixturesView, TournamentEditInfoView,
)

urlpatterns = [
    path('', TournamentListCreateView.as_view(), name='tournament-list-create'),
    path('my/', MyTournamentsView.as_view(), name='my-tournaments'),
    path('search/', TournamentSearchView.as_view(), name='tournament-search'),
    path('viewer-dashboard/', ViewerDashboardView.as_view(), name='viewer-dashboard'),
    path('<uuid:pk>/', TournamentDetailView.as_view(), name='tournament-detail'),
    path('<uuid:pk>/edit-info/', TournamentEditInfoView.as_view(), name='tournament-edit-info'),
    path('<uuid:pk>/publish/', TournamentPublishView.as_view(), name='tournament-publish'),
    path('<uuid:pk>/complete/', TournamentCompleteView.as_view(), name='tournament-complete'),
    path('<uuid:pk>/activate/', TournamentActivateView.as_view(), name='tournament-activate'),
    path('<uuid:pk>/check-complete/', TournamentCheckCompleteView.as_view(), name='tournament-check-complete'),
    path('<uuid:pk>/reopen/', TournamentReopenView.as_view(), name='tournament-reopen'),
    path('<uuid:pk>/generate-fixtures/', TournamentGenerateFixturesView.as_view(), name='tournament-generate-fixtures'),
    path('<uuid:pk>/groups/', TournamentGroupsListView.as_view(), name='tournament-groups-list'),
    path('<uuid:pk>/groups/assign/', TournamentGroupAssignView.as_view(), name='tournament-group-assign'),
    path('<uuid:pk>/groups/generate/', TournamentGroupGenerateView.as_view(), name='tournament-group-generate'),
    path('<uuid:pk>/groups/fixtures/', TournamentGroupFixturesView.as_view(), name='tournament-group-fixtures'),
]
