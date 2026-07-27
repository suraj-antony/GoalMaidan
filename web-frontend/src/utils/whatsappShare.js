export const shareMatchResult = (match, tournamentName, tournamentId) => {
  const goals = (match.events || [])
    .filter(e => e.event_type === 'goal')
    .map(e => `${e.player_name} (${e.minute}')`)
    .join(', ');

  const msg =
    `⚽ *${tournamentName}*\n` +
    `🏟️ ${match.stage}\n\n` +
    `🔴 ${match.team_a_name}  ${match.score_a} – ${match.score_b}  ${match.team_b_name} 🔵\n\n` +
    `⚽ Goals: ${goals || 'N/A'}\n` +
    `🏅 Man of Match: ${match.motm || 'TBD'}\n\n` +
    `📲 Full stats: ${window.location.origin}/tournament/${tournamentId}\n\n` +
    `_Powered by GoalMaidan ⚽_`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

export const shareFixture = (fixture, tournamentName, tournamentId) => {
  const msg =
    `📅 *Upcoming — ${tournamentName}*\n` +
    `🏟️ ${fixture.stage}\n\n` +
    `🔴 ${fixture.team_a_name}  vs  ${fixture.team_b_name} 🔵\n\n` +
    `🕔 ${fixture.match_date} at ${fixture.match_time}\n` +
    `📍 ${fixture.venue || 'TBD'}\n\n` +
    `📲 Follow live: ${window.location.origin}/tournament/${tournamentId}\n\n` +
    `_Powered by GoalMaidan ⚽_`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};
