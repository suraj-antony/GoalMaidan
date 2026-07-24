from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Count
from .models import MatchAward, TournamentAward, LeagueTable
from .serializers import MatchAwardSerializer, TournamentAwardSerializer, LeagueTableSerializer
from apps.fixtures.models import Fixture, MatchEvent
from apps.tournaments.models import Tournament

class MatchAwardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can give awards"}, status=status.HTTP_403_FORBIDDEN)
            
        fixture_id = request.data.get('fixture_id')
        fixture = get_object_or_404(Fixture, id=fixture_id)
        if request.user != fixture.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = MatchAwardSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TournamentAwardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upsert (create or update) a tournament-level award winner."""
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can give awards"}, status=status.HTTP_403_FORBIDDEN)

        tournament_id = request.data.get('tournament_id') or request.data.get('tournament')
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)

        award_type = request.data.get('award_type')
        player_name = (request.data.get('player_name') or '').strip()
        team_name = (request.data.get('team_name') or '').strip()

        if not award_type:
            return Response({"error": "award_type is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not player_name:
            return Response({"error": "player_name is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Upsert: update existing or create new
        award, created = TournamentAward.objects.update_or_create(
            tournament=tournament,
            award_type=award_type,
            defaults={
                'player_name': player_name,
                'team_name': team_name,
            }
        )
        return Response(TournamentAwardSerializer(award).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        """Remove a tournament-level award winner."""
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can remove awards"}, status=status.HTTP_403_FORBIDDEN)

        tournament_id = request.data.get('tournament_id') or request.data.get('tournament')
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)

        award_type = request.data.get('award_type')
        deleted_count, _ = TournamentAward.objects.filter(tournament=tournament, award_type=award_type).delete()
        if deleted_count == 0:
            return Response({"error": "Award not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"message": "Award removed."}, status=status.HTTP_200_OK)


def _has_stats_access(request, tournament):
    if not tournament.public_stats:
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'role', '') == 'viewer':
            has_access = tournament.vieweraccessrequest_set.filter(viewer=request.user, status='approved').exists() if hasattr(tournament, 'vieweraccessrequest_set') else False
            return has_access
        if request.user == tournament.organiser:
            return True
        return False
    return True

@api_view(['GET'])
@permission_classes([AllowAny])
def tournament_top_scorers(request, tournament_id):
    """
    Aggregate all goal events for a tournament.
    Group by player_name (and team), order by count descending.
    """
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if not _has_stats_access(request, tournament):
        return Response({'error': 'Access denied'}, status=403)

    scorers = (
        MatchEvent.objects
        .filter(
            fixture__tournament_id=tournament_id,
            event_type='goal',
            fixture__status='completed',
        )
        .values('player_name', 'team__name')
        .annotate(goals=Count('id'))
        .order_by('-goals')
    )

    result = [
        {
            'rank': i + 1,
            'player_name': s['player_name'] or 'Unknown',
            'team_name': s['team__name'] or '—',
            'goals': s['goals'],
        }
        for i, s in enumerate(scorers)
    ]

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def tournament_top_assists(request, tournament_id):
    """
    Aggregate all assist events for a tournament.
    """
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if not _has_stats_access(request, tournament):
        return Response({'error': 'Access denied'}, status=403)

    providers = (
        MatchEvent.objects
        .filter(
            fixture__tournament_id=tournament_id,
            event_type='assist',
            fixture__status='completed',
        )
        .values('player_name', 'team__name')
        .annotate(assists=Count('id'))
        .order_by('-assists')
    )

    result = [
        {
            'rank': i + 1,
            'player_name': p['player_name'] or 'Unknown',
            'team_name': p['team__name'] or '—',
            'assists': p['assists'],
        }
        for i, p in enumerate(providers)
    ]

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def tournament_goal_contributions(request, tournament_id):
    """
    Goals + Assists combined per player, ordered by total contributions.
    """
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if not _has_stats_access(request, tournament):
        return Response({'error': 'Access denied'}, status=403)

    events = (
        MatchEvent.objects
        .filter(
            fixture__tournament_id=tournament_id,
            event_type__in=['goal', 'assist'],
            fixture__status='completed',
        )
        .values('player_name', 'team__name', 'event_type')
        .annotate(count=Count('id'))
    )

    players = {}
    for e in events:
        key = (e['player_name'] or 'Unknown', e['team__name'] or '—')
        if key not in players:
            players[key] = {'goals': 0, 'assists': 0}
        if e['event_type'] == 'goal':
            players[key]['goals'] += e['count']
        elif e['event_type'] == 'assist':
            players[key]['assists'] += e['count']

    result = sorted(
        [
            {
                'player_name': k[0],
                'team_name': k[1],
                'goals': v['goals'],
                'assists': v['assists'],
                'contributions': v['goals'] + v['assists'],
            }
            for k, v in players.items()
        ],
        key=lambda x: -x['contributions']
    )

    for i, r in enumerate(result):
        r['rank'] = i + 1

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def tournament_league_table(request, tournament_id):
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if not _has_stats_access(request, tournament):
        return Response({'error': 'Access denied'}, status=403)

    tables = LeagueTable.objects.filter(tournament=tournament).order_by('-points', '-goal_difference', '-goals_for')
    return Response(LeagueTableSerializer(tables, many=True).data)



@api_view(['GET'])
@permission_classes([AllowAny])
def tournament_all_stats(request, tournament_id):
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if not _has_stats_access(request, tournament):
        return Response({'error': 'Access denied'}, status=403)

    scorers_res = tournament_top_scorers(request, tournament_id)
    assists_res = tournament_top_assists(request, tournament_id)
    contrib_res = tournament_goal_contributions(request, tournament_id)
    table_res = tournament_league_table(request, tournament_id)

    match_awards = MatchAwardSerializer(MatchAward.objects.filter(fixture__tournament=tournament), many=True).data
    tournament_awards = TournamentAwardSerializer(TournamentAward.objects.filter(tournament=tournament), many=True).data

    return Response({
        "top_scorers": scorers_res.data,
        "top_assists": assists_res.data,
        "goal_contributions": contrib_res.data,
        "league_table": table_res.data,
        "scorers": scorers_res.data,
        "assists": assists_res.data,
        "match_awards": match_awards,
        "tournament_awards": tournament_awards,
    })


# Backwards compatible APIView wrappers
class BaseStatView(APIView):
    permission_classes = [AllowAny]

class TopScorersView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, tournament_id):
        return tournament_top_scorers(request._request, tournament_id)

class TopAssistsView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, tournament_id):
        return tournament_top_assists(request._request, tournament_id)

class LeagueTableView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, tournament_id):
        return tournament_league_table(request._request, tournament_id)

class MatchAwardsListView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, tournament_id):
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if not _has_stats_access(request, tournament):
            return Response({"error": "Access restricted"}, status=status.HTTP_403_FORBIDDEN)
        awards = MatchAward.objects.filter(fixture__tournament=tournament)
        return Response(MatchAwardSerializer(awards, many=True).data)

class TournamentAwardsListView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, tournament_id):
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if not _has_stats_access(request, tournament):
            return Response({"error": "Access restricted"}, status=status.HTTP_403_FORBIDDEN)
        awards = TournamentAward.objects.filter(tournament=tournament)
        return Response(TournamentAwardSerializer(awards, many=True).data)

class AllStatsView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, tournament_id):
        return tournament_all_stats(request._request, tournament_id)
