from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Team, Player, ViewerAccessRequest
from apps.tournaments.models import Tournament
from .serializers import TeamSerializer, PlayerSerializer, ViewerAccessRequestSerializer
import cloudinary.uploader

class TeamListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tournament_id = request.query_params.get('tournament')
        if not tournament_id:
            return Response({"error": "tournament parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        teams = Team.objects.filter(tournament_id=tournament_id)
        return Response(TeamSerializer(teams, many=True).data)

    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can create teams"}, status=status.HTTP_403_FORBIDDEN)
            
        tournament_id = request.data.get('tournament')
        tournament = get_object_or_404(Tournament, id=tournament_id)
        
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = TeamSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TeamDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        if request.user != team.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
        if team.tournament.status != 'draft':
            return Response({"error": "Cannot edit teams after tournament is activated."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = TeamSerializer(team, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        if request.user != team.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
        if team.tournament.status != 'draft':
            return Response({"error": "Cannot delete teams after tournament is activated."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Validation: Minimum 2 teams must remain after deletion
        if team.tournament.teams.count() <= 2:
            return Response({"error": "Cannot delete team. A minimum of 2 teams must remain in the tournament."}, status=status.HTTP_400_BAD_REQUEST)
            
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class PlayerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team_id = request.query_params.get('team')
        if not team_id:
            return Response({"error": "team parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        players = Player.objects.filter(team_id=team_id)
        return Response(PlayerSerializer(players, many=True).data)

    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can create players"}, status=status.HTTP_403_FORBIDDEN)
            
        team_id = request.data.get('team')
        team = get_object_or_404(Team, id=team_id)
        
        if request.user != team.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        # Support bulk list of names: { team: <id>, names: ["Ronaldo", "Messi", "Neymar"] }
        names_list = request.data.get('names')
        if isinstance(names_list, list) and len(names_list) > 0:
            created = []
            for name in names_list:
                cleaned_name = str(name).strip()
                if cleaned_name:
                    p = Player.objects.create(team=team, name=cleaned_name)
                    created.append(p)
            return Response(PlayerSerializer(created, many=True).data, status=status.HTTP_201_CREATED)

        serializer = PlayerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PlayerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        player = get_object_or_404(Player, pk=pk)
        if request.user != player.team.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)

        serializer = PlayerSerializer(player, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        player = get_object_or_404(Player, pk=pk)
        if request.user != player.team.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)

        player.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class VerifyPlayerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        player = get_object_or_404(Player, pk=pk)
        if request.user != player.team.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        action = request.data.get('action')
        if action == 'approve':
            player.is_verified = True
            player.rejection_reason = None
        elif action == 'reject':
            player.is_verified = False
            player.rejection_reason = request.data.get('reason', 'Rejected')
        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
            
        player.save()
        return Response(PlayerSerializer(player).data)

class PublicUploadCertificateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        tournament = get_object_or_404(Tournament, verification_link_token=token)
        player_id = request.data.get('player_id')
        file = request.FILES.get('certificate')
        
        if not file or not player_id:
            return Response({"error": "player_id and certificate file required"}, status=status.HTTP_400_BAD_REQUEST)
            
        player = get_object_or_404(Player, id=player_id, team__tournament=tournament)
        
        # Upload directly to Cloudinary
        upload_data = cloudinary.uploader.upload(file)
        player.age_certificate_url = upload_data.get('secure_url')
        player.save()
        
        return Response(PlayerSerializer(player).data)

class PublicVerifyPlayersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        tournament = get_object_or_404(Tournament, verification_link_token=token)
        players = Player.objects.filter(team__tournament=tournament)
        return Response(PlayerSerializer(players, many=True).data)

class AccessRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'viewer':
            return Response({"error": "Only viewers can request access"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ViewerAccessRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(viewer=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PendingAccessRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can view requests"}, status=status.HTTP_403_FORBIDDEN)
            
        requests = ViewerAccessRequest.objects.filter(tournament__organiser=request.user, status='pending')
        return Response(ViewerAccessRequestSerializer(requests, many=True).data)

class ManageAccessRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        req = get_object_or_404(ViewerAccessRequest, pk=pk)
        if request.user != req.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        status_val = request.data.get('status')
        if status_val in ['approved', 'rejected']:
            req.status = status_val
            req.responded_at = timezone.now()
            req.save()
            return Response(ViewerAccessRequestSerializer(req).data)
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
