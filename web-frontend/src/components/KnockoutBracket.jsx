import { Trophy } from 'lucide-react';

export default function KnockoutBracket({ fixtures }) {
  // A simple visual representation of knockout brackets.
  // In a full implementation, you'd calculate rounds and draw connections.
  // We'll create a list grouped by stages for now.

  if (!fixtures || fixtures.length === 0) return null;

  const stages = ['final', 'semi', 'quarter'];
  const grouped = {};
  
  stages.forEach(stage => {
    grouped[stage] = fixtures.filter(f => f.stage === stage);
  });

  return (
    <div className="flex flex-col md:flex-row justify-center gap-8 p-4 overflow-x-auto min-w-full">
      {stages.reverse().map(stage => (
        grouped[stage]?.length > 0 && (
          <div key={stage} className="flex flex-col justify-around gap-6 min-w-[250px]">
            <h3 className="text-center font-bold uppercase text-[var(--txt2)] text-sm mb-2 border-b border-[var(--border)] pb-2">
              {stage}
            </h3>
            {grouped[stage].map(fixture => {
              const winnerId = fixture.winner || (fixture.score_a > fixture.score_b ? fixture.team_a : fixture.score_b > fixture.score_a ? fixture.team_b : null);
              const teamAWon = winnerId && (String(winnerId) === String(fixture.team_a) || fixture.score_a > fixture.score_b);
              const teamBWon = winnerId && (String(winnerId) === String(fixture.team_b) || fixture.score_b > fixture.score_a);
              const hasPenalties = fixture.penalty_score_a != null && fixture.penalty_score_b != null;
              return (
              <div key={fixture.id} className="bg-[var(--card)] border border-[var(--border)] rounded-md shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-[var(--border)] hover:bg-[var(--bg2)]">
                  <span className={`font-semibold truncate max-w-[150px] ${teamAWon ? 'text-primary-600 font-extrabold' : ''}`}>
                    {fixture.team_a_name || 'TBD'}
                  </span>
                  <div className="text-right">
                    <span className="font-bold font-mono">{fixture.score_a}</span>
                    {hasPenalties && <span className="text-xs text-orange-600 font-bold ml-1">({fixture.penalty_score_a})</span>}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-[var(--bg2)]">
                  <span className={`font-semibold truncate max-w-[150px] ${teamBWon ? 'text-primary-600 font-extrabold' : ''}`}>
                    {fixture.team_b_name || 'TBD'}
                  </span>
                  <div className="text-right">
                    <span className="font-bold font-mono">{fixture.score_b}</span>
                    {hasPenalties && <span className="text-xs text-orange-600 font-bold ml-1">({fixture.penalty_score_b})</span>}
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
