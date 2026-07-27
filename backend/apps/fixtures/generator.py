"""
Fixture generator functions for GoalMaidan.
Each function returns a list of unsaved Fixture instances ready for bulk_create().
"""
import math
import random
from .models import Fixture


# ─────────────────────────────────────────────────────────────────────────────
# 1. LEAGUE — round-robin, every team plays every other team once (or twice)
# ─────────────────────────────────────────────────────────────────────────────

def generate_league_fixtures(tournament, teams, home_and_away=False):
    """
    Classic round-robin league.
    home_and_away=True → each pair plays twice (home & away legs).
    """
    team_list = list(teams)
    if len(team_list) < 2:
        return []

    # Add BYE slot for odd number of teams
    if len(team_list) % 2 != 0:
        team_list.append(None)

    num_teams = len(team_list)
    num_rounds = num_teams - 1
    half = num_teams // 2
    fixtures = []

    def _make_round(rnd_offset=0):
        rotated = [team_list[0]] + list(team_list[1:])
        for round_num in range(num_rounds):
            for i in range(half):
                home = rotated[i]
                away = rotated[num_teams - 1 - i]
                # Skip BYE matchups
                if home is None or away is None:
                    continue
                # Alternate anchor pairing home/away each round for balance
                if i == 0 and round_num % 2 == 1:
                    home, away = away, home
                fixtures.append(Fixture(
                    tournament=tournament,
                    stage='league',
                    team_a=home,
                    team_b=away,
                    round_number=rnd_offset + round_num + 1,
                ))
            # Rotate: keep index 0 fixed, rotate the rest
            rotated.insert(1, rotated.pop())

    _make_round(rnd_offset=0)

    if home_and_away:
        # Second leg — swap home/away
        for rnd in range(num_rounds):
            for i in range(half):
                # We need to rebuild — easier to invert the first leg fixtures
                pass
        # Simpler approach: replay with teams swapped
        second_leg_fixtures = []
        for f in fixtures:
            second_leg_fixtures.append(Fixture(
                tournament=tournament,
                stage='league',
                team_a=f.team_b,
                team_b=f.team_a,
                round_number=f.round_number + num_rounds,
            ))
        fixtures.extend(second_leg_fixtures)

    return fixtures


# ─────────────────────────────────────────────────────────────────────────────
# 2. KNOCKOUT — single-elimination bracket
# ─────────────────────────────────────────────────────────────────────────────

def _stage_label(num_remaining):
    """Return stage string based on remaining team count in a round."""
    if num_remaining <= 2:
        return 'final'
    elif num_remaining <= 4:
        return 'semi'
    elif num_remaining <= 8:
        return 'quarter'
    else:
        return 'group'  # early rounds in large brackets


STAGE_NAMES_BY_SIZE = {
    2: ['final'],
    4: ['semi', 'final'],
    8: ['quarter', 'semi', 'final'],
    16: ['round_of_16', 'quarter', 'semi', 'final'],
    32: ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'],
}


def get_stage_sequence(num_teams):
    """
    Returns the ordered list of stage names for the full bracket,
    based on the (rounded up to next power of 2) number of teams.
    """
    size = 2
    while size < num_teams:
        size *= 2
    return STAGE_NAMES_BY_SIZE.get(size, ['final'])


def generate_full_bracket(tournament, teams):
    """
    Creates the ENTIRE bracket upfront — round 1 with real teams,
    and all future rounds as empty placeholder fixtures (team_a/team_b = None),
    all linked together via next_fixture + next_fixture_slot so that
    winners automatically advance when results are saved.

    Handles byes automatically if team count is not a power of 2
    (top seeds get a bye — team advances to round 2 automatically).
    """
    from apps.fixtures.models import Fixture
    import random

    team_list = list(teams)
    random.shuffle(team_list)
    n = len(team_list)

    if n < 2:
        return []

    stages = get_stage_sequence(n)
    bracket_size = 2 ** len(stages)  # e.g. 8 for quarter/semi/final

    # Pad with byes (None) up to bracket_size
    while len(team_list) < bracket_size:
        team_list.append(None)

    fixtures_by_round = []  # list of lists — fixtures_by_round[0] = round 1 fixtures

    # ── Round 1 — real matchups (with byes handled) ──
    round1_fixtures = []
    i = 0
    pos = 0
    while i < len(team_list):
        team_a = team_list[i]
        team_b = team_list[i + 1] if i + 1 < len(team_list) else None

        fixture = Fixture(
            tournament=tournament,
            stage=stages[0],
            round_number=1,
            team_a=team_a,
            team_b=team_b,
            status='scheduled',
            bracket_position=pos,
        )
        round1_fixtures.append(fixture)
        i += 2
        pos += 1

    fixtures_by_round.append(round1_fixtures)

    # ── Future rounds — empty placeholders ──
    prev_round_count = len(round1_fixtures)
    for round_idx in range(1, len(stages)):
        this_round_count = math.ceil(prev_round_count / 2)
        this_round_fixtures = []
        for pos in range(this_round_count):
            fixture = Fixture(
                tournament=tournament,
                stage=stages[round_idx],
                round_number=round_idx + 1,
                team_a=None,
                team_b=None,
                status='scheduled',
                bracket_position=pos,
            )
            this_round_fixtures.append(fixture)
        fixtures_by_round.append(this_round_fixtures)
        prev_round_count = this_round_count

    # ── Save all fixtures first (need IDs before we can link them) ──
    all_fixtures = [f for round_fixtures in fixtures_by_round for f in round_fixtures]
    Fixture.objects.bulk_create(all_fixtures)

    # ── Now link each fixture to its next_fixture + slot ──
    for round_idx in range(len(fixtures_by_round) - 1):
        current_round = fixtures_by_round[round_idx]
        next_round = fixtures_by_round[round_idx + 1]

        for i, fixture in enumerate(current_round):
            next_fixture = next_round[i // 2]
            slot = 'a' if i % 2 == 0 else 'b'
            fixture.next_fixture = next_fixture
            fixture.next_fixture_slot = slot

        Fixture.objects.bulk_update(current_round, ['next_fixture', 'next_fixture_slot'])

    # ── Handle byes — if one side of round 1 match is None, auto-advance the other ──
    for fixture in fixtures_by_round[0]:
        if fixture.team_a and not fixture.team_b:
            _advance_winner(fixture, fixture.team_a)
        elif fixture.team_b and not fixture.team_a:
            _advance_winner(fixture, fixture.team_b)

    return []  # Already saved directly via bulk_create above


def _advance_winner(fixture, winning_team):
    """
    Pushes the winning team into the next round's fixture slot.
    Used both for byes (round 1) and for normal match completion.
    """
    if not fixture.next_fixture:
        return  # This was the final — no next round

    next_fixture = fixture.next_fixture
    if fixture.next_fixture_slot == 'a':
        next_fixture.team_a = winning_team
    else:
        next_fixture.team_b = winning_team
    next_fixture.save(update_fields=['team_a', 'team_b'])


def advance_winner_after_result(fixture):
    """
    PUBLIC function — call this after a knockout match result is saved.
    Determines the winner and advances them into the next round.
    """
    if fixture.score_a == fixture.score_b:
        if fixture.winner:
            _advance_winner(fixture, fixture.winner)
        return

    winner = fixture.team_a if fixture.score_a > fixture.score_b else fixture.team_b
    _advance_winner(fixture, winner)


def generate_knockout_fixtures(tournament, teams):
    """Wrapper — kept for backward compatibility with existing calls."""
    return generate_full_bracket(tournament, teams)


# ─────────────────────────────────────────────────────────────────────────────
# 3. MULTI-GROUP (World Cup style) — groups → knockout
# ─────────────────────────────────────────────────────────────────────────────

def generate_multigroup_fixtures(tournament, teams, num_groups=4, qualifiers_per_group=2, home_and_away=False):
    """
    Split teams into groups, run a round-robin within each group.
    """
    team_list = list(teams)
    random.shuffle(team_list)

    if num_groups < 1:
        num_groups = 1

    # Distribute teams into groups as evenly as possible
    groups = [[] for _ in range(num_groups)]
    for idx, team in enumerate(team_list):
        groups[idx % num_groups].append(team)

    fixtures = []
    rnd_offset = 0

    for group_idx, group in enumerate(groups):
        if len(group) < 2:
            continue
        group_fixtures = generate_league_fixtures(tournament, group, home_and_away=home_and_away)
        # Tag round numbers with group offset so they don't collide
        max_rnd = max((f.round_number for f in group_fixtures), default=0)
        for f in group_fixtures:
            f.round_number += rnd_offset
        fixtures.extend(group_fixtures)
        rnd_offset += max_rnd

    return fixtures



# ─────────────────────────────────────────────────────────────────────────────
# 4. SINGLE-GROUP + KNOCKOUT (Champions League style) — all in one league group
# ─────────────────────────────────────────────────────────────────────────────

def generate_single_group_knockout_fixtures(tournament, teams, knockout_qualifiers=4, home_and_away=False):
    """
    All teams play in one league group, top N qualify for knockout.
    Creates league fixtures only.
    """
    team_list = list(teams)
    if len(team_list) < 2:
        return []

    league_fixtures = generate_league_fixtures(tournament, team_list, home_and_away=home_and_away)
    return league_fixtures



# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_knockout_placeholders(tournament, num_teams, start_round=1):
    """
    Build a full single-elimination bracket of placeholder (None-team) fixtures
    for `num_teams` qualifiers. Used after a group phase.
    """
    if num_teams < 2:
        return []

    # Round up to next power of 2
    next_pow2 = 1
    while next_pow2 < num_teams:
        next_pow2 *= 2

    fixtures = []
    remaining = next_pow2
    rnd = start_round

    while remaining >= 2:
        stage = _stage_label(remaining)
        for _ in range(remaining // 2):
            fixtures.append(Fixture(
                tournament=tournament,
                stage=stage,
                team_a=None,
                team_b=None,
                round_number=rnd,
            ))
        remaining //= 2
        rnd += 1

    return fixtures


# ─────────────────────────────────────────────────────────────────────────────
# Backwards-compatible alias
# (apps/fixtures/views.py still imports the old name)
# ─────────────────────────────────────────────────────────────────────────────

def generate_league_knockout_fixtures(tournament, teams, num_qualifiers=4):
    """Alias kept for backwards compatibility with existing views/imports."""
    return generate_single_group_knockout_fixtures(
        tournament, teams, knockout_qualifiers=num_qualifiers
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main entry point — used by views for both on-create and on-demand generation
# ─────────────────────────────────────────────────────────────────────────────

def run_auto_generate(tournament):
    """
    Main entry point. Reads tournament settings and delegates to the correct
    generator function. Returns a list of unsaved Fixture instances ready for
    bulk_create(). Raises ValueError if there are not enough teams.
    """
    from apps.teams.models import Team

    teams = list(Team.objects.filter(tournament=tournament))

    if len(teams) < 2:
        raise ValueError(
            f'Need at least 2 teams to generate fixtures. '
            f'Only {len(teams)} team(s) found.'
        )

    t_type = tournament.tournament_type
    home_and_away = getattr(tournament, 'home_and_away', False)

    if t_type == 'league':
        return generate_league_fixtures(tournament, teams, home_and_away)

    elif t_type == 'knockout':
        return generate_knockout_fixtures(tournament, teams)

    elif t_type == 'league_knockout':
        style = getattr(tournament, 'league_knockout_style', None) or 'single_group'

        if style == 'multi_group':
            num_groups = getattr(tournament, 'num_groups', None) or 4
            qualifiers_per_group = getattr(tournament, 'qualifiers_per_group', None) or 2
            return generate_multigroup_fixtures(
                tournament, teams,
                num_groups=num_groups,
                qualifiers_per_group=qualifiers_per_group,
                home_and_away=home_and_away,
            )
        else:
            # single_group — league phase then knockout
            knockout_qualifiers = getattr(tournament, 'qualifiers_per_group', None) or 4
            return generate_single_group_knockout_fixtures(
                tournament, teams,
                knockout_qualifiers=knockout_qualifiers,
                home_and_away=home_and_away,
            )

    return []
