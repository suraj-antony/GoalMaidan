from django.urls import path
from .views import (
    TeamListCreateView, TeamDetailView, PlayerListCreateView, PlayerDetailView, VerifyPlayerView,
    PublicUploadCertificateView, PublicVerifyPlayersView, AccessRequestView,
    PendingAccessRequestsView, ManageAccessRequestView
)

urlpatterns = [
    # General app URLs mapping (teams/)
    path('', TeamListCreateView.as_view(), name='team-list-create'),
    path('<uuid:pk>/', TeamDetailView.as_view(), name='team-detail'),
    
    # Players
    path('players/', PlayerListCreateView.as_view(), name='player-list-create'),
    path('players/<uuid:pk>/', PlayerDetailView.as_view(), name='player-detail'),
    path('players/<uuid:pk>/verify/', VerifyPlayerView.as_view(), name='player-verify'),
    
    # Access Requests
    path('access-requests/', AccessRequestView.as_view(), name='access-request'),
    path('access-requests/pending/', PendingAccessRequestsView.as_view(), name='pending-requests'),
    path('access-requests/<uuid:pk>/', ManageAccessRequestView.as_view(), name='manage-request'),
    
    # Public verification link mappings (verify/)
    path('<str:token>/upload/', PublicUploadCertificateView.as_view(), name='public-upload'),
    path('<str:token>/players/', PublicVerifyPlayersView.as_view(), name='public-players'),
]
