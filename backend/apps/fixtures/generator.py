"""
Fixture generator functions for TourneyFC.
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


def generate_knockout_fixtures(tournament, teams, shuffle=True):
    """
    Single-elimination bracket.
    Creates only the first round with real teams; subsequent rounds have
    placeholder (None) teams to be filled by the organiser as the bracket
    progresses.
    """
    team_list = list(teams)
    if len(team_list) < 2:
        return []

    if shuffle:
        random.shuffle(team_list)

    # Pad to next power of 2
    next_pow2 = 1
    while next_pow2 < len(team_list):
        next_pow2 *= 2

    byes = next_pow2 - len(team_list)
    # Insert BYEs at the end (teams with a BYE advance automatically)
    team_list += [None] * byes

    fixtures = []
    stage = _stage_label(next_pow2)

    for i in range(0, next_pow2, 2):
        fixtures.append(Fixture(
            tournament=tournament,
            stage=stage,
            team_a=team_list[i],
            team_b=team_list[i + 1],
            round_number=1,
        ))

    # Add placeholder fixtures for subsequent rounds
    remaining = next_pow2 // 2
    rnd = 2
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
