from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Fixture, MatchEvent
from .serializers import FixtureSerializer, MatchEventSerializer
from apps.tournaments.models import Tournament
from apps.teams.models import Team, Player
from apps.awards.models import LeagueTable, MatchAward
from apps.tournaments.views import check_tournament_complete
from .generator import generate_league_fixtures, generate_knockout_fixtures, generate_league_knockout_fixtures

def _auto_advance_bracket(tournament, from_stage, to_stage):
    """
    After every match in `from_stage` is completed, collect the winners
    in round_number / created_at order and slot them into the `to_stage`
    fixtures (which were pre-created with team_a=None / team_b=None).

    Winner is resolved from:
      1. fixture.winner  (set for draws that went to penalties)
      2. score comparison  (clear winner)
    """
    from_fixtures = Fixture.objects.filter(
        tournament=tournament, stage=from_stage
    ).order_by('round_number', 'created_at')

    # All must be completed before we do anything
    if from_fixtures.count() == 0:
        return
    if from_fixtures.filter(status='completed').count() < from_fixtures.count():
        return  # Not all done yet

    # Collect winners in order
    winners = []
    for f in from_fixtures:
        if f.winner:
            winners.append(f.winner)
        elif f.score_a is not None and f.score_b is not None:
            if f.score_a > f.score_b:
                winners.append(f.team_a)
            elif f.score_b > f.score_a:
                winners.append(f.team_b)
            # (draw with no winner yet — skip; shouldn't happen for knockout)

    if not winners:
        return

    # Find the next-stage fixtures ordered by round_number / created_at
    next_fixtures = Fixture.objects.filter(
        tournament=tournament, stage=to_stage
    ).order_by('round_number', 'created_at')

    if not next_fixtures.exists():
        return

    # Slot winners pair-by-pair into the next-stage fixtures
    # Winner 0 & 1 → fixture 0 (team_a / team_b), winners 2 & 3 → fixture 1, etc.
    next_list = list(next_fixtures)
    for i, nf in enumerate(next_list):
        idx_a = i * 2
        idx_b = i * 2 + 1
        changed = False
        if idx_a < len(winners) and nf.team_a is None:
            nf.team_a = winners[idx_a]
            changed = True
        if idx_b < len(winners) and nf.team_b is None:
            nf.team_b = winners[idx_b]
            changed = True
        if changed:
            nf.save()


def recalculate_league_table(tournament_id):

    # Reset all stats for this tournament's league table
    LeagueTable.objects.filter(tournament_id=tournament_id).update(
        played=0, won=0, drawn=0, lost=0, goals_for=0, goals_against=0, points=0
    )
    
    # Get all completed league or group stage fixtures
    fixtures = Fixture.objects.filter(
        tournament_id=tournament_id, status='completed'
    ).filter(
        Q(stage='league') | Q(stage__startswith='group_')
    )
    
    for f in fixtures:
        if not f.team_a or not f.team_b:
            continue
            
        table_a, _ = LeagueTable.objects.get_or_create(tournament_id=tournament_id, team=f.team_a)
        table_b, _ = LeagueTable.objects.get_or_create(tournament_id=tournament_id, team=f.team_b)
        
        # Update played
        table_a.played += 1
        table_b.played += 1
        
        # Update goals
        table_a.goals_for += f.score_a
        table_a.goals_against += f.score_b
        table_b.goals_for += f.score_b
        table_b.goals_against += f.score_a
        
        # Update W/D/L and points
        if f.score_a > f.score_b:
            table_a.won += 1
            table_a.points += 3
            table_b.lost += 1
        elif f.score_a < f.score_b:
            table_b.won += 1
            table_b.points += 3
            table_a.lost += 1
        else:
            table_a.drawn += 1
            table_b.drawn += 1
            table_a.points += 1
            table_b.points += 1
            
        table_a.save()
        table_b.save()


# ─────────────────────────────────────────────────────────────────────────────
# LEAGUE PHASE STATUS HELPER
# ─────────────────────────────────────────────────────────────────────────────

def get_league_status(tournament):
    """
    Returns dict with:
    - league_complete: bool
    - total_league: int
    - completed_league: int
    - knockout_exists: bool
    - qualified_teams: list of team dicts (ordered by standing)
    """
    LEAGUE_STAGES = ['league', 'group_a', 'group_b', 'group_c', 'group_d',
                     'group_e', 'group_f', 'group_g', 'group_h',
                     'group_i', 'group_j', 'group_k', 'group_l']

    KNOCKOUT_STAGES = ['quarter', 'semi', 'final', 'round_of_16',
                       'round_of_32', 'third_place']

    # All league stage fixtures (union of named stages + group_ prefix)
    league_fixtures = tournament.fixtures.filter(stage__in=LEAGUE_STAGES)
    league_fixtures_group = tournament.fixtures.filter(stage__startswith='group_')
    all_league = (league_fixtures | league_fixtures_group).distinct()

    total = all_league.count()
    completed = all_league.filter(status='completed').count()
    league_complete = (total > 0 and total == completed)

    # Check if knockout fixtures already exist
    knockout_exists = tournament.fixtures.filter(stage__in=KNOCKOUT_STAGES).exists()

    # Get qualified teams based on league table
    qualified_teams = []
    if league_complete:
        style = getattr(tournament, 'league_knockout_style', 'single_group') or 'single_group'

        if style == 'single_group':
            # Top N from single league table
            n = getattr(tournament, 'knockout_qualifiers', 4) or 4
            table = LeagueTable.objects.filter(
                tournament=tournament
            ).order_by('-points', '-goals_for', 'goals_against')[:n]

            qualified_teams = [
                {
                    'id': str(row.team.id),
                    'name': row.team.name,
                    'points': row.points,
                    'goals_for': row.goals_for,
                    'goals_against': row.goals_against,
                    'rank': i + 1,
                }
                for i, row in enumerate(table)
            ]

        elif style == 'multi_group':
            # Top N from each group
            num_groups = getattr(tournament, 'num_groups', 4) or 4
            qualifiers_per_group = getattr(tournament, 'qualifiers_per_group', 2) or 2

            for g in range(num_groups):
                group_name = chr(65 + g)  # 'A', 'B', etc.
                from apps.tournaments.models import TournamentGroup
                group_obj = TournamentGroup.objects.filter(tournament=tournament, name=group_name).first()
                if not group_obj:
                    continue

                group_fixture_teams = list(group_obj.teams.values_list('id', flat=True))
                if not group_fixture_teams:
                    continue

                group_table = LeagueTable.objects.filter(
                    tournament=tournament,
                    team_id__in=group_fixture_teams
                ).order_by('-points', '-goals_for', 'goals_against')[:qualifiers_per_group]

                for i, row in enumerate(group_table):
                    qualified_teams.append({
                        'id': str(row.team.id),
                        'name': row.team.name,
                        'points': row.points,
                        'group': f'Group {group_name}',
                        'group_rank': i + 1,
                    })

    return {
        'league_complete': league_complete,
        'total_league': total,
        'completed_league': completed,
        'knockout_exists': knockout_exists,
        'qualified_teams': qualified_teams,
    }


# ─────────────────────────────────────────────────────────────────────────────
# LEAGUE STATUS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_phase_status(request, tournament_id):
    """
    GET /api/fixtures/league-status/<tournament_id>/
    Returns league completion status and qualified teams.
    """
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if tournament.organiser != request.user:
        return Response({'error': 'Permission denied'}, status=403)

    status_data = get_league_status(tournament)
    return Response(status_data)


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE KNOCKOUT AFTER LEAGUE ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_knockout_after_league(request, tournament_id):
    """
    POST /api/fixtures/generate-knockout/<tournament_id>/
    Called by organiser after league phase is complete.
    Creates round 1 knockout fixtures from qualified teams.

    Body (optional for manual seeding):
    {
      "mode": "auto",           // "auto" or "manual"
      "team_order": ["id1", "id2", "id3", "id4"],  // for manual seeding
      "force_regenerate": false
    }
    """
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)

    if tournament.organiser != request.user:
        return Response({'error': 'Permission denied'}, status=403)

    if tournament.tournament_type not in ['league_knockout']:
        return Response({'error': 'This is not a League + Knockout tournament'}, status=400)

    # Check league is complete
    status_data = get_league_status(tournament)
    if not status_data['league_complete']:
        remaining = status_data['total_league'] - status_data['completed_league']
        return Response({
            'error': f'League phase is not complete yet. {remaining} match(es) remaining.',
            'completed': status_data['completed_league'],
            'total': status_data['total_league'],
        }, status=400)

    KNOCKOUT_STAGES = ['quarter', 'semi', 'final', 'round_of_16', 'round_of_32', 'third_place']

    # Check knockout doesn't already exist
    if status_data['knockout_exists']:
        if not request.data.get('force_regenerate'):
            return Response({
                'error': 'Knockout fixtures already exist.',
                'hint': 'Send force_regenerate: true to delete and regenerate.',
            }, status=400)
        # Delete existing knockout fixtures
        tournament.fixtures.filter(stage__in=KNOCKOUT_STAGES).delete()

    # Get qualified teams from status
    qualified = status_data['qualified_teams']
    if len(qualified) < 2:
        return Response({'error': 'Not enough qualified teams to create knockout.'}, status=400)

    mode = request.data.get('mode', 'auto')
    team_order_ids = request.data.get('team_order', [])

    # Get Team objects in correct order
    if mode == 'manual' and team_order_ids:
        # Manual seeding — organiser chose the order
        teams_ordered = []
        for team_id in team_order_ids:
            try:
                teams_ordered.append(Team.objects.get(id=team_id, tournament=tournament))
            except Team.DoesNotExist:
                pass
    else:
        # Auto — use league standing order (1st vs last, 2nd vs second-last, etc.)
        team_ids = [q['id'] for q in qualified]
        teams_ordered = list(Team.objects.filter(id__in=team_ids, tournament=tournament))
        # Sort by qualified order
        id_order = {qid: i for i, qid in enumerate(team_ids)}
        teams_ordered.sort(key=lambda t: id_order.get(str(t.id), 999))

    if len(teams_ordered) < 2:
        return Response({'error': 'Could not resolve enough teams to create knockout fixtures.'}, status=400)

    # Determine stage name based on number of teams
    n = len(teams_ordered)
    if n <= 2:
        stage = 'final'
    elif n <= 4:
        stage = 'semi'
    elif n <= 8:
        stage = 'quarter'
    else:
        stage = 'round_of_16'

    # Create fixtures: 1st vs last, 2nd vs 2nd-last (seeded bracket)
    fixtures_to_create = []
    lo, hi = 0, len(teams_ordered) - 1
    round_num = 1

    while lo < hi:
        fixtures_to_create.append(Fixture(
            tournament=tournament,
            stage=stage,
            round_number=round_num,
            team_a=teams_ordered[lo],
            team_b=teams_ordered[hi],
            status='scheduled',
        ))
        lo += 1
        hi -= 1
        round_num += 1

    # Add placeholder fixtures for subsequent rounds
    remaining = lo  # number of matches in first round (n // 2)
    next_rnd = round_num  # continue round numbers
    while remaining >= 2:
        remaining //= 2
        if remaining <= 1:
            next_stage = 'final'
        elif remaining <= 2:
            next_stage = 'semi'
        elif remaining <= 4:
            next_stage = 'quarter'
        else:
            next_stage = 'round_of_16'

        for _ in range(remaining):
            fixtures_to_create.append(Fixture(
                tournament=tournament,
                stage=next_stage,
                round_number=next_rnd,
                team_a=None,
                team_b=None,
                status='scheduled',
            ))
            next_rnd += 1

    Fixture.objects.bulk_create(fixtures_to_create)

    # Reset tournament status to active so organizer can record scores for the new knockout fixtures
    tournament.status = 'active'
    tournament.completed_at = None
    tournament.save()

    return Response({
        'message': 'Knockout fixtures created successfully.',
        'stage': stage,
        'fixture_count': len(fixtures_to_create),
        'qualified_teams': [t.name for t in teams_ordered],
    }, status=201)



class AutoGenerateFixturesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can generate fixtures"}, status=status.HTTP_403_FORBIDDEN)
            
        tournament_id = request.data.get('tournament')
        type_ = request.data.get('type')
        qualifiers = int(request.data.get('qualifiers', 4))
        
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        teams = list(Team.objects.filter(tournament=tournament))
        
        # Clear existing unplayed fixtures if regenerating (optional, but good for demo)
        Fixture.objects.filter(tournament=tournament, status='scheduled').delete()
        
        if type_ == 'league':
            fixtures = generate_league_fixtures(tournament, teams)
        elif type_ == 'knockout':
            fixtures = generate_knockout_fixtures(tournament, teams)
        elif type_ == 'league_knockout':
            fixtures = generate_league_knockout_fixtures(tournament, teams, qualifiers)
        else:
            return Response({"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Bulk create
        Fixture.objects.bulk_create(fixtures)
        
        # If league, initialize empty LeagueTable
        if type_ in ['league', 'league_knockout']:
            for t in teams:
                LeagueTable.objects.get_or_create(tournament=tournament, team=t)
                
        return Response({"message": f"{len(fixtures)} fixtures generated"}, status=status.HTTP_201_CREATED)

class ManualFixturesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can create fixtures"}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data
        if not isinstance(data, list):
            return Response({"error": "Expected array of fixture objects"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not data:
            return Response({"error": "Empty array"}, status=status.HTTP_400_BAD_REQUEST)
            
        tournament_id = data[0].get('tournament')
        if not tournament_id:
             return Response({"error": "Tournament ID required"}, status=status.HTTP_400_BAD_REQUEST)
             
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        created_fixtures = []
        for item in data:
            serializer = FixtureSerializer(data=item)
            if serializer.is_valid():
                created_fixtures.append(serializer.save())
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        return Response(FixtureSerializer(created_fixtures, many=True).data, status=status.HTTP_201_CREATED)

def validate_fixture_duplicate(tournament, team_a_id, team_b_id, stage=None, exclude_fixture_id=None):
    if not team_a_id or not team_b_id:
        return None
    if str(team_a_id) == str(team_b_id):
        return "Team A and Team B must be different teams."

    try:
        team_a = Team.objects.get(id=team_a_id)
        team_b = Team.objects.get(id=team_b_id)
    except Team.DoesNotExist:
        return "Invalid team selected."

    qs = Fixture.objects.filter(tournament=tournament)
    if stage:
        qs = qs.filter(stage=stage)
    if exclude_fixture_id:
        qs = qs.exclude(id=exclude_fixture_id)

    # Matches between team_a and team_b in either order
    same_pair = qs.filter(
        (Q(team_a_id=team_a_id) & Q(team_b_id=team_b_id)) |
        (Q(team_a_id=team_b_id) & Q(team_b_id=team_a_id))
    )

    if not tournament.home_and_away:
        if same_pair.exists():
            return f"A match between {team_a.name} and {team_b.name} already exists. Single-match mode allows only 1 match per pair."
    else:
        if same_pair.count() >= 2:
            return f"Maximum 2 matches (Home & Away) allowed between {team_a.name} and {team_b.name}."
        if same_pair.filter(team_a_id=team_a_id, team_b_id=team_b_id).exists():
            return f"Home match {team_a.name} vs {team_b.name} already exists. You can add the away match ({team_b.name} vs {team_a.name})."

    return None

class FixtureListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tournament_id = request.query_params.get('tournament')
        if not tournament_id:
            return Response({"error": "tournament parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        tournament = get_object_or_404(Tournament, id=tournament_id)
        
        # Access control
        if request.user.role == 'viewer' and not tournament.public_stats:
            has_access = tournament.vieweraccessrequest_set.filter(viewer=request.user, status='approved').exists() if hasattr(tournament, 'vieweraccessrequest_set') else False
            if not has_access:
                return Response({"error": "Access restricted"}, status=status.HTTP_403_FORBIDDEN)
                
        fixtures = Fixture.objects.filter(tournament=tournament).order_by('match_date', 'match_time', 'round_number')

        # Auto-advance: fill next-round placeholders if previous stage is fully complete
        # This handles cases where semis were already done before this feature existed.
        knockout_stages = [
            ('round_of_16', 'quarter'),
            ('quarter', 'semi'),
            ('semi', 'final'),
        ]
        for from_stage, to_stage in knockout_stages:
            if fixtures.filter(stage=from_stage).exists():
                _auto_advance_bracket(tournament, from_stage=from_stage, to_stage=to_stage)

        # Re-fetch after potential updates
        fixtures = Fixture.objects.filter(tournament=tournament).order_by('match_date', 'match_time', 'round_number')
        return Response(FixtureSerializer(fixtures, many=True).data)


    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can create fixtures"}, status=status.HTTP_403_FORBIDDEN)
        
        tournament_id = request.data.get('tournament')
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        if tournament.status == 'completed':
            return Response({"error": "Cannot add fixtures after tournament is completed."}, status=status.HTTP_400_BAD_REQUEST)

        dup_error = validate_fixture_duplicate(
            tournament,
            request.data.get('team_a'),
            request.data.get('team_b'),
            stage=request.data.get('stage')
        )
        if dup_error:
            return Response({"error": dup_error}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FixtureSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FixtureDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        fixture = get_object_or_404(Fixture, pk=pk)
        return Response(FixtureSerializer(fixture).data)

    def put(self, request, pk):
        fixture = get_object_or_404(Fixture, pk=pk)
        if request.user != fixture.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
        if fixture.tournament.status == 'completed':
            return Response({"error": "Cannot edit fixtures after tournament is completed."}, status=status.HTTP_400_BAD_REQUEST)

        dup_error = validate_fixture_duplicate(
            fixture.tournament,
            request.data.get('team_a', fixture.team_a_id),
            request.data.get('team_b', fixture.team_b_id),
            stage=request.data.get('stage', fixture.stage),
            exclude_fixture_id=fixture.id
        )
        if dup_error:
            return Response({"error": dup_error}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = FixtureSerializer(fixture, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        fixture = get_object_or_404(Fixture, pk=pk)
        if request.user != fixture.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
        if fixture.tournament.status == 'completed':
            return Response({"error": "Cannot delete fixtures after tournament is completed."}, status=status.HTTP_400_BAD_REQUEST)
            
        fixture.delete()
        return Response({"message": "Fixture deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class MatchResultView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            fixture = Fixture.objects.get(id=pk)
        except Fixture.DoesNotExist:
            return Response({'error': 'Match not found'}, status=404)

        # Permission check
        if fixture.tournament.organiser != request.user:
            return Response({'error': 'Permission denied'}, status=403)

        data = request.data

        # Save scores
        fixture.score_a = data.get('score_a', 0)
        fixture.score_b = data.get('score_b', 0)
        fixture.status = 'completed'
        if data.get('match_date'):
            fixture.match_date = data['match_date']
        if data.get('match_time'):
            fixture.match_time = data['match_time']

        # Penalty shootout (knockout draws only)
        knockout_stages = ['quarter', 'semi', 'third_place', 'final', 'round_of_16']
        is_knockout = fixture.stage in knockout_stages
        is_draw = fixture.score_a == fixture.score_b

        if is_knockout and is_draw:
            pen_a = data.get('penalty_score_a')
            pen_b = data.get('penalty_score_b')
            winner_id = data.get('winner_id')

            fixture.penalty_score_a = pen_a if pen_a is not None else None
            fixture.penalty_score_b = pen_b if pen_b is not None else None

            # Resolve winner
            if winner_id:
                from apps.teams.models import Team as TeamModel
                try:
                    fixture.winner = TeamModel.objects.get(id=winner_id)
                except TeamModel.DoesNotExist:
                    fixture.winner = None
            elif pen_a is not None and pen_b is not None:
                if pen_a > pen_b:
                    fixture.winner = fixture.team_a
                elif pen_b > pen_a:
                    fixture.winner = fixture.team_b
                else:
                    fixture.winner = None
            else:
                fixture.winner = None
        else:
            # Clear penalty/winner fields for non-knockout or non-draw results
            fixture.penalty_score_a = None
            fixture.penalty_score_b = None
            if is_knockout:
                # Set winner based on score
                if fixture.score_a > fixture.score_b:
                    fixture.winner = fixture.team_a
                elif fixture.score_b > fixture.score_a:
                    fixture.winner = fixture.team_b
                else:
                    fixture.winner = None
            else:
                fixture.winner = None

        fixture.save()

        # Delete old events for this fixture before saving new ones
        fixture.events.all().delete()

        # Save goal scorers — no minute required
        for event in data.get('goals', []):
            p_name = event.get('player_name', '').strip()
            if p_name:
                MatchEvent.objects.create(
                    fixture=fixture,
                    player_name=p_name,
                    player=Player.objects.filter(id=event.get('player_id')).first() if event.get('player_id') else None,
                    team=Team.objects.filter(id=event.get('team_id')).first() if event.get('team_id') else None,
                    event_type='goal',
                    minute=0,  # Default to 0
                )

        # Save assists — no minute required
        for event in data.get('assists', []):
            p_name = event.get('player_name', '').strip()
            if p_name:
                MatchEvent.objects.create(
                    fixture=fixture,
                    player_name=p_name,
                    player=Player.objects.filter(id=event.get('player_id')).first() if event.get('player_id') else None,
                    team=Team.objects.filter(id=event.get('team_id')).first() if event.get('team_id') else None,
                    event_type='assist',
                    minute=0,
                )

        # Save cards — minute is optional
        for event in data.get('cards', []):
            p_name = event.get('player_name', '').strip()
            if p_name:
                MatchEvent.objects.create(
                    fixture=fixture,
                    player_name=p_name,
                    player=Player.objects.filter(id=event.get('player_id')).first() if event.get('player_id') else None,
                    team=Team.objects.filter(id=event.get('team_id')).first() if event.get('team_id') else None,
                    event_type=event.get('card_type', 'yellow_card'),
                    minute=event.get('minute') or 0,
                )

        # Save Man of the Match
        if data.get('man_of_match'):
            MatchAward.objects.filter(fixture=fixture, award_type='man_of_match').delete()
            MatchAward.objects.create(
                fixture=fixture,
                player_name=data['man_of_match'].get('player_name', ''),
                player=Player.objects.filter(id=data['man_of_match'].get('player_id')).first() if data['man_of_match'].get('player_id') else None,
                award_type='man_of_match',
            )

        # If it's a league/group match, update the league table
        if fixture.stage in ['league', 'group_a', 'group_b', 'group_c', 'group_d',
                              'group_e', 'group_f', 'group_g', 'group_h'] or \
           fixture.stage.startswith('group_'):
            recalculate_league_table(fixture.tournament_id)

        # ── Auto-advance knockout bracket ──
        # When all semi-finals are done → fill the final with the two winners
        if fixture.stage == 'semi':
            _auto_advance_bracket(fixture.tournament, from_stage='semi', to_stage='final')

        # When all quarter-finals are done → fill semi-final slots with winners
        if fixture.stage == 'quarter':
            _auto_advance_bracket(fixture.tournament, from_stage='quarter', to_stage='semi')

        # When all round-of-16 are done → fill quarter-final slots with winners
        if fixture.stage == 'round_of_16':
            _auto_advance_bracket(fixture.tournament, from_stage='round_of_16', to_stage='quarter')

        # Check if tournament is now complete
        check_tournament_complete(fixture.tournament)


        return Response({
            'message': 'Result saved successfully.',
            'fixture_id': str(fixture.id),
            'score_a': fixture.score_a,
            'score_b': fixture.score_b,
            'penalty_score_a': fixture.penalty_score_a,
            'penalty_score_b': fixture.penalty_score_b,
            'winner_id': str(fixture.winner.id) if fixture.winner else None,
            'winner_name': fixture.winner.name if fixture.winner else None,
            'status': fixture.status,
        })


class MatchEventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        fixture = get_object_or_404(Fixture, pk=pk)
        
        # Check permissions if viewer
        if request.user.role == 'viewer' and not fixture.tournament.public_stats:
             has_access = fixture.tournament.vieweraccessrequest_set.filter(viewer=request.user, status='approved').exists() if hasattr(fixture.tournament, 'vieweraccessrequest_set') else False
             if not has_access:
                 return Response({"error": "Access restricted"}, status=status.HTTP_403_FORBIDDEN)
                 
        events = MatchEvent.objects.filter(fixture=fixture).order_by('minute')
        return Response(MatchEventSerializer(events, many=True).data)

    def post(self, request, pk):
        fixture = get_object_or_404(Fixture, pk=pk)
        if request.user != fixture.tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data.copy()
        data['fixture'] = fixture.id
        serializer = MatchEventSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
