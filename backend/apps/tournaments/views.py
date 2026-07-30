from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Tournament
from .serializers import TournamentSerializer
from apps.teams.models import Team
from apps.fixtures.generator import (
    generate_league_fixtures,
    generate_knockout_fixtures,
    generate_multigroup_fixtures,
    generate_single_group_knockout_fixtures,
    run_auto_generate,
)
from apps.fixtures.models import Fixture


class TournamentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers can create tournaments"}, status=status.HTTP_403_FORBIDDEN)

        serializer = TournamentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            tournament = serializer.save(organiser=request.user)

            # Auto-create Team records from team_names_list
            team_names = [n.strip() for n in (tournament.team_names_list or []) if n and n.strip()]
            teams = []
            for name in team_names:
                team = Team.objects.create(
                    tournament=tournament,
                    name=name,
                    manager_name='TBD',
                    manager_phone='0000000000',
                )
                teams.append(team)

            # Auto-generate fixtures if mode is 'auto' and we have enough teams
            if tournament.fixture_generation_mode == 'auto' and len(teams) >= 2:
                try:
                    fixtures = run_auto_generate(tournament)
                    if fixtures:
                        Fixture.objects.bulk_create(fixtures)
                        tournament.fixtures_generated = True
                        tournament.save(update_fields=['fixtures_generated'])
                except ValueError:
                    pass  # Not enough teams — skip silently
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f'Fixture generation failed on create: {e}')

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MyTournamentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'organiser':
            return Response({"error": "Only organisers have this view"}, status=status.HTTP_403_FORBIDDEN)
        
        tournaments = Tournament.objects.filter(organiser=request.user).order_by('-created_at')
        serializer = TournamentSerializer(tournaments, many=True)
        return Response(serializer.data)

FORMAT_LOCKED_FIELDS = [
    'tournament_type',
    'league_knockout_style',
    'group_config',
    'home_and_away',
    'knockout_qualifiers',
    'num_groups',
    'qualifiers_per_group',
]


def has_completed_matches(tournament):
    """Returns True if this tournament has at least one completed fixture."""
    return tournament.fixtures.filter(status='completed').exists()


class TournamentEditInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)

        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied.'}, status=403)

        locked = has_completed_matches(tournament)
        completed_count = tournament.fixtures.filter(status='completed').count()
        total_count = tournament.fixtures.count()

        serializer = TournamentSerializer(tournament)
        data = serializer.data
        data['format_locked'] = locked
        data['completed_matches_count'] = completed_count
        data['total_matches_count'] = total_count

        return Response(data)


class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tournament.objects.filter(organiser=self.request.user)

    def update(self, request, *args, **kwargs):
        return self._handle_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._handle_update(request, *args, **kwargs)

    def _handle_update(self, request, *args, **kwargs):
        tournament = self.get_object()

        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied.'}, status=403)

        data = request.data
        locked = has_completed_matches(tournament)

        # Check if the request is trying to change any format-locked field
        attempted_format_change = False
        for field in FORMAT_LOCKED_FIELDS:
            if field in data:
                current_value = getattr(tournament, field, None)
                new_value = data.get(field)
                # Compare as strings to avoid type mismatches (e.g. JSON list vs list)
                if str(current_value) != str(new_value):
                    attempted_format_change = True
                    break

        if attempted_format_change and locked:
            return Response({
                'error': 'Tournament format cannot be changed after matches have started. '
                         'At least one match has already been completed.',
                'locked_fields': FORMAT_LOCKED_FIELDS,
            }, status=400)

        # If format IS changing (and allowed), delete existing fixtures
        format_is_changing = attempted_format_change and not locked

        serializer = self.get_serializer(tournament, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        deleted_fixture_count = 0
        if format_is_changing:
            deleted_fixture_count = tournament.fixtures.count()
            tournament.fixtures.all().delete()
            tournament.fixtures_generated = False
            if hasattr(tournament, 'group_config'):
                tournament.group_config = tournament.group_config if 'group_config' in data else tournament.group_config
            tournament.save(update_fields=['fixtures_generated'])

        response_data = serializer.data
        response_data['format_changed'] = format_is_changing
        response_data['deleted_fixtures'] = deleted_fixture_count

        return Response(response_data)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            data = serializer.data
            # Add extra detail
            data['teams'] = [
                {
                    'id': str(t.id),
                    'name': t.name,
                    'manager_name': t.manager_name,
                    'manager_phone': t.manager_phone,
                    'player_count': t.player_set.count(),
                    'players': [
                        {'id': str(p.id), 'name': p.name}
                        for p in t.player_set.all()
                    ]
                }
                for t in instance.teams.all()
            ]
            data['teams_list'] = data['teams']
            data['fixture_count'] = instance.fixtures.count()
            data['completed_fixtures'] = instance.fixtures.filter(status='completed').count()
            return Response(data)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=404)

    def destroy(self, request, *args, **kwargs):
        tournament = self.get_object()

        # Only the owner can delete
        if tournament.organiser != request.user:
            return Response(
                {'error': 'You do not have permission to delete this tournament.'},
                status=status.HTTP_403_FORBIDDEN
            )

        tournament_name = tournament.name

        # Delete the tournament and all related data
        # Django CASCADE will automatically delete teams, fixtures, events, awards, etc.
        tournament.delete()

        return Response(
            {'message': f'Tournament "{tournament_name}" has been permanently deleted.'},
            status=status.HTTP_200_OK
        )

class TournamentPublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
        
        tournament.status = 'active'
        tournament.save()
        return Response({"status": "Tournament published"})

class TournamentCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        if request.user != tournament.organiser:
            return Response({"error": "You don't own this tournament"}, status=status.HTTP_403_FORBIDDEN)
        
        tournament.status = 'completed'
        tournament.save()
        return Response({"status": "Tournament completed"})

class TournamentSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '')
        ground_type = request.query_params.get('ground_type')
        tournament_type = request.query_params.get('tournament_type')
        age_category = request.query_params.get('age_category')
        status_param = request.query_params.get('status')
        
        tournaments = Tournament.objects.filter(public_stats=True)
        
        if status_param:
            tournaments = tournaments.filter(status=status_param)
            
        if ground_type:
            tournaments = tournaments.filter(ground_type=ground_type)
            
        if tournament_type:
            tournaments = tournaments.filter(tournament_type=tournament_type)
            
        if age_category:
            tournaments = tournaments.filter(age_category=age_category)
            
        if query:
            tournaments = tournaments.filter(
                Q(name__icontains=query) | 
                Q(organiser__area_name__icontains=query) |
                Q(team__name__icontains=query)
            ).distinct()
            
        # Pagination can be added if needed
        serializer = TournamentSerializer(tournaments, many=True)
        return Response(serializer.data)

class ViewerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'viewer':
            return Response({"error": "Only viewers have this view"}, status=status.HTTP_403_FORBIDDEN)
            
        # For simplicity in this demo, return public tournaments and ones they have access to
        public_t = Tournament.objects.filter(public_stats=True)
        
        approved_t_ids = []
        if hasattr(request.user, 'vieweraccessrequest_set'):
            approved_t_ids = list(request.user.vieweraccessrequest_set.filter(status='approved').values_list('tournament_id', flat=True))
            
        private_t = Tournament.objects.filter(id__in=approved_t_ids)
        
        all_t = (public_t | private_t).distinct()
        
        live = all_t.filter(status='active').order_by('-created_at')
        upcoming = all_t.filter(status='draft').order_by('-created_at')
        completed = all_t.filter(status='completed').order_by('-created_at')
        
        return Response({
            "live": TournamentSerializer(live, many=True).data,
            "upcoming": TournamentSerializer(upcoming, many=True).data,
            "completed": TournamentSerializer(completed, many=True).data
        })


from django.utils import timezone
from .models import TournamentGroup
from apps.teams.models import Team

class TournamentActivateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)

        # Only the owner can activate
        if tournament.organiser != request.user:
            return Response(
                {'error': 'You do not have permission to activate this tournament.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Already active or completed
        if tournament.status != 'draft':
            return Response(
                {'error': f'Tournament is already {tournament.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Must have at least 2 teams registered
        team_count = tournament.teams.count()
        if team_count < 2:
            return Response(
                {'error': f'At least 2 teams must be registered to activate. Currently {team_count} team(s) added.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fixture check — ONLY required for auto mode
        # Manual mode organisers create fixtures themselves after activating
        if tournament.fixture_generation_mode == 'auto':
            fixture_count = tournament.fixtures.count()
            if fixture_count == 0:
                return Response(
                    {
                        'error': 'No fixtures have been generated yet.',
                        'hint': 'Go to the Fixtures tab and click "Generate Fixtures" first.',
                        'can_generate': True,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        tournament.status = 'active'
        tournament.activated_at = timezone.now()
        tournament.save()

        # If league style, auto-initialize empty LeagueTable entries if they don't exist yet
        if tournament.tournament_type in ['league', 'league_knockout']:
            from apps.awards.models import LeagueTable
            for t in tournament.teams.all():
                LeagueTable.objects.get_or_create(tournament=tournament, team=t)

        return Response({
            'message': 'Tournament activated successfully.',
            'status': 'active',
            'id': str(tournament.id),
        })

class TournamentCheckCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)

        if tournament.organiser != request.user:
            return Response(
                {'error': 'You do not have permission to manage this tournament.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if tournament.status != 'active':
            return Response({'message': 'Tournament is not active.', 'status': tournament.status})

        total = tournament.fixtures.count()
        completed = tournament.fixtures.filter(status='completed').count()

        if total > 0 and total == completed:
            tournament.status = 'completed'
            tournament.completed_at = timezone.now()
            tournament.save()
            return Response({
                'message': 'All matches complete. Tournament marked as completed.',
                'status': 'completed',
            })

        return Response({
            'message': f'{completed}/{total} matches completed.',
            'status': 'active',
        })

class TournamentReopenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if tournament.status != 'completed':
            return Response({'error': 'Only completed tournaments can be reopened.'}, status=status.HTTP_400_BAD_REQUEST)
        tournament.status = 'active'
        tournament.completed_at = None
        tournament.save()
        return Response({'status': 'active', 'message': 'Tournament reopened successfully.'})

class TournamentGroupsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        
        # Ensure groups exist
        num_g = tournament.num_groups or 4
        group_names = [chr(65 + i) for i in range(num_g)]
        for name in group_names:
            TournamentGroup.objects.get_or_create(tournament=tournament, name=name)

        groups = TournamentGroup.objects.filter(tournament=tournament).order_by('name')
        
        data = []
        for g in groups:
            data.append({
                'id': str(g.id),
                'name': g.name,
                'teams': [
                    {'id': str(t.id), 'name': t.name}
                    for t in g.teams.all()
                ]
            })
        return Response(data)

class TournamentGroupAssignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if tournament.status != 'draft':
            return Response({'error': 'Cannot change group assignment after tournament is activated.'}, status=status.HTTP_400_BAD_REQUEST)

        assignments = request.data.get('assignments')
        if assignments is not None:
            if not isinstance(assignments, list):
                return Response({'error': 'Assignments must be a list.'}, status=status.HTTP_400_BAD_REQUEST)
            
            team_ids = [a.get('team_id') for a in assignments if a.get('team_id')]
            teams_map = {str(t.id): t for t in Team.objects.filter(id__in=team_ids, tournament=tournament)}
            
            for team in teams_map.values():
                for g in TournamentGroup.objects.filter(tournament=tournament):
                    g.teams.remove(team)
            
            for a in assignments:
                t_id = str(a.get('team_id'))
                g_name = a.get('group_name')
                if t_id in teams_map and g_name:
                    group, _ = TournamentGroup.objects.get_or_create(tournament=tournament, name=g_name)
                    group.teams.add(teams_map[t_id])
            
            return Response({'message': 'Bulk groups assigned successfully.'})

        team_id = request.data.get('team_id')
        group_name = request.data.get('group_name')

        team = get_object_or_404(Team, id=team_id, tournament=tournament)
        
        for g in TournamentGroup.objects.filter(tournament=tournament):
            g.teams.remove(team)

        if group_name:
            group, _ = TournamentGroup.objects.get_or_create(tournament=tournament, name=group_name)
            group.teams.add(team)

        return Response({'message': f'Team {team.name} assigned to Group {group_name}'})

class TournamentGroupGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if tournament.status != 'draft':
            return Response({'error': 'Cannot assign groups after tournament is activated.'}, status=status.HTTP_400_BAD_REQUEST)

        num_g = tournament.num_groups or 4
        group_names = [chr(65 + i) for i in range(num_g)]
        
        groups = []
        for name in group_names:
            g, _ = TournamentGroup.objects.get_or_create(tournament=tournament, name=name)
            g.teams.clear()
            groups.append(g)

        teams = list(Team.objects.filter(tournament=tournament))
        import random
        random.shuffle(teams)

        for idx, team in enumerate(teams):
            g = groups[idx % len(groups)]
            g.teams.add(team)

        return Response({'message': 'Groups generated randomly.'})

class TournamentGroupFixturesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if tournament.status != 'draft':
            return Response({'error': 'Cannot generate fixtures after tournament is activated.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.fixtures.models import Fixture
        from apps.fixtures.generator import generate_league_fixtures
        
        Fixture.objects.filter(tournament=tournament, status='scheduled').delete()

        groups = TournamentGroup.objects.filter(tournament=tournament)
        all_fixtures = []
        rnd_offset = 0

        for g in groups:
            g_teams = list(g.teams.all())
            if len(g_teams) < 2:
                continue
            g_fixtures = generate_league_fixtures(tournament, g_teams, home_and_away=tournament.home_and_away)
            max_rnd = 0
            for f in g_fixtures:
                f.stage = f'group_{g.name.lower()}'
                f.round_number += rnd_offset
                max_rnd = max(max_rnd, f.round_number)
            all_fixtures.extend(g_fixtures)
            rnd_offset = max_rnd

        total_qualifiers = groups.count() * (tournament.qualifiers_per_group or 2)
        from apps.fixtures.generator import _build_knockout_placeholders
        ko_fixtures = _build_knockout_placeholders(tournament, total_qualifiers, start_round=rnd_offset + 1)
        all_fixtures.extend(ko_fixtures)

        if all_fixtures:
            Fixture.objects.bulk_create(all_fixtures)

        return Response({'message': f'{len(all_fixtures)} fixtures generated.'})

def check_tournament_complete(tournament):
    total = tournament.fixtures.count()
    completed = tournament.fixtures.filter(status='completed').count()
    if total == 0:
        return

    # For knockout-based tournaments, it is only complete if the final match is completed
    if tournament.tournament_type in ['knockout', 'league_knockout']:
        final_match = tournament.fixtures.filter(stage='final').first()
        if not final_match or final_match.status != 'completed':
            return # final is not done yet

    if total == completed:
        tournament.status = 'completed'
        tournament.completed_at = timezone.now()
        tournament.save()



class TournamentGenerateFixturesView(APIView):
    """
    POST /api/tournaments/<uuid>/generate-fixtures/
    Generate (or regenerate) fixtures for a tournament in Draft status.
    Only valid for auto fixture_generation_mode tournaments.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)

        if tournament.organiser != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if tournament.status != 'draft':
            return Response(
                {'error': 'Fixtures can only be generated when the tournament is in Draft status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if tournament.fixture_generation_mode != 'auto':
            return Response(
                {'error': 'This tournament uses manual fixture entry.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete existing auto-generated fixtures before regenerating
        existing_count = tournament.fixtures.count()
        tournament.fixtures.all().delete()

        try:
            fixtures = run_auto_generate(tournament)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Fixture generation error: {e}')
            return Response({'error': 'An unexpected error occurred during fixture generation.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not fixtures:
            return Response(
                {'error': 'No fixtures could be generated. Make sure at least 2 teams are added.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        Fixture.objects.bulk_create(fixtures)

        # Mark as generated
        tournament.fixtures_generated = True
        tournament.save(update_fields=['fixtures_generated'])

        return Response({
            'message': f'Successfully generated {len(fixtures)} fixtures.',
            'fixture_count': len(fixtures),
            'deleted_previous': existing_count,
        })
