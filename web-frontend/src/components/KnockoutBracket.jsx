import { Trophy } from 'lucide-react';

export default function KnockoutBracket({ fixtures }) {
  // A simple visual representation of knockout brackets.
  // In a full implementation, you'd calculate rounds and draw connections.
  // We'll create a list grouped by stages for now.

  if (!fixtures || fixtures.length === 0) return null;

  const stages = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place'];
  const stageDisplayNames = {
    'round_of_32': 'Round of 32',
    'round_of_16': 'Round of 16',
    'quarter': 'Quarter Final',
    'semi': 'Semi Final',
    'third_place': 'Third Place Playoff',
    'final': 'Final',
  };
  const grouped = {};
  
  stages.forEach(stage => {
    grouped[stage] = fixtures.filter(f => f.stage === stage);
  });

  return (
    <div className="flex flex-col md:flex-row justify-center gap-8 p-4 overflow-x-auto min-w-full">
      {stages.map(stage => (
        grouped[stage]?.length > 0 && (
          <div key={stage} className="flex flex-col justify-around gap-6 min-w-[250px]">
            <h3 className="text-center font-bold uppercase text-[var(--txt2)] text-sm mb-2 border-b border-[var(--border)] pb-2">
              {stageDisplayNames[stage] || stage}
            </h3>
            {grouped[stage].map(fixture => {
              const isComp = fixture.status === 'completed';

              // Resolve winner ID — prefer explicit field, fall back to score diff
              const winnerId = fixture.winner
                ? String(fixture.winner)
                : fixture.score_a > fixture.score_b
                ? String(fixture.team_a)
                : fixture.score_b > fixture.score_a
                ? String(fixture.team_b)
                : null;

              const teamAWon = isComp && winnerId && String(fixture.team_a) === winnerId;
              const teamBWon = isComp && winnerId && String(fixture.team_b) === winnerId;
              const teamALost = isComp && winnerId && !teamAWon;
              const teamBLost = isComp && winnerId && !teamBWon;
              const hasPenalties = fixture.penalty_score_a != null && fixture.penalty_score_b != null;

              const rowCls = (won, lost) =>
                `flex justify-between items-center p-3 ${won ? 'bg-green-50' : lost ? 'bg-gray-50' : 'bg-[var(--card)]'}`;

              const nameCls = (won, lost) =>
                `truncate max-w-[150px] font-semibold
                 ${won ? 'text-green-700 font-extrabold' : ''}
                 ${lost ? 'line-through text-gray-400 opacity-75' : ''}`;

              const scoreCls = (won, lost) =>
                `font-bold font-mono ${won ? 'text-green-700' : lost ? 'text-gray-400 opacity-65' : ''}`;

              return (
                <div key={fixture.id} className="bg-[var(--card)] border border-[var(--border)] rounded-md shadow-sm overflow-hidden">
                  {/* Team A row */}
                  <div className={`${rowCls(teamAWon, teamALost)} border-b border-[var(--border)]`}>
                    <span className={nameCls(teamAWon, teamALost)}>
                      {fixture.team_a_name || 'TBD'}
                    </span>
                    <div className="text-right">
                      <span className={scoreCls(teamAWon, teamALost)}>{fixture.score_a}</span>
                      {hasPenalties && <span className="text-xs text-orange-500 font-bold ml-1">({fixture.penalty_score_a})</span>}
                    </div>
                  </div>
                  {/* Team B row */}
                  <div className={rowCls(teamBWon, teamBLost)}>
                    <span className={nameCls(teamBWon, teamBLost)}>
                      {fixture.team_b_name || 'TBD'}
                    </span>
                    <div className="text-right">
                      <span className={scoreCls(teamBWon, teamBLost)}>{fixture.score_b}</span>
                      {hasPenalties && <span className="text-xs text-orange-500 font-bold ml-1">({fixture.penalty_score_b})</span>}
                    </div>
                  </div>
                  {hasPenalties && (
                    <div className="px-3 py-1 text-center text-[10px] font-bold text-orange-600 bg-orange-50 border-t border-orange-100">
                      Won on penalties
                    </div>
                  )}
                  {stage === 'final' && fixture.status === 'completed' && fixture.winner_name && (
                    <div className="bg-yellow-100 text-yellow-800 p-2 text-center text-xs font-bold flex items-center justify-center gap-1">
                      <Trophy size={14} /> Winner: {fixture.winner_name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ))}
    </div>
  );
}
