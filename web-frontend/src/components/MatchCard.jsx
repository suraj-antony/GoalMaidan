import { useTranslation } from 'react-i18next';
import WhatsAppShareButton from './WhatsAppShareButton';
import StatusBadge from './StatusBadge';

export default function MatchCard({ match, fixture, tournamentName, tournamentId, editable, onEdit }) {
  const { t } = useTranslation();
  const activeFixture = fixture || match;
  
  if (!activeFixture) return null;

  const isCompleted = activeFixture.status === 'completed';

  const scoreA = Number(activeFixture.score_a);
  const scoreB = Number(activeFixture.score_b);
  // Determine loser regardless of stage (knockout or league)
  const isTeamALoser = isCompleted && ((scoreB > scoreA) || (scoreA === scoreB && activeFixture.winner && String(activeFixture.winner) === String(activeFixture.team_b)));
  const isTeamBLoser = isCompleted && ((scoreA > scoreB) || (scoreA === scoreB && activeFixture.winner && String(activeFixture.winner) === String(activeFixture.team_a)));

  // Split scorers by team from the fixture's events
  const teamAId = activeFixture.team_a?.id || activeFixture.team_a;
  const teamBId = activeFixture.team_b?.id || activeFixture.team_b;

  const scorersTeamA = (activeFixture.events || [])
    .filter(e => e.event_type === 'goal' && String(e.team_id) === String(teamAId));
  const scorersTeamB = (activeFixture.events || [])
    .filter(e => e.event_type === 'goal' && String(e.team_id) === String(teamBId));

  return (
    <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-4 mb-4 hover:border-primary-500/50 transition-all duration-200">
      {/* Stage / round label + status/share */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold px-2 py-1 bg-[var(--bg2)] rounded-md text-[var(--txt2)] uppercase tracking-wider">
          {activeFixture.stage?.replace('_', ' ')} {activeFixture.round_number ? `· Round ${activeFixture.round_number}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {isCompleted && <StatusBadge status={activeFixture.status} />}
          <WhatsAppShareButton 
            match={activeFixture} 
            tournamentName={tournamentName} 
            tournamentId={tournamentId} 
          />
        </div>
      </div>

      {/* Two-column team + score + scorers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start py-2">

        {/* Team A side */}
        <div className="text-right overflow-hidden">
          <div className={`font-bold text-base text-[var(--txt)] mb-1 truncate px-1 ${isTeamALoser ? 'line-through text-[var(--txt2)] font-semibold opacity-75' : ''}`}>
            {activeFixture.team_a_name}
          </div>
          {isCompleted && scorersTeamA.length > 0 && (
            <div className="space-y-0.5">
              {scorersTeamA.map((s, i) => (
                <div key={i} className="text-xs text-[var(--txt2)] font-medium">
                  {s.player_name} ⚽
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-center min-w-[80px] px-2 font-mono">
          {isCompleted ? (
            <div className="text-xl font-black text-[var(--txt)] bg-[var(--bg2)] border border-[var(--border)] rounded-lg px-3 py-1.5 inline-block">
              {activeFixture.score_a} - {activeFixture.score_b}
              {activeFixture.penalty_score_a !== null && activeFixture.penalty_score_b !== null && (
                <div className="text-[10px] font-bold text-orange-500 mt-0.5">
                  ({activeFixture.penalty_score_a} - {activeFixture.penalty_score_b} P)
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs font-extrabold text-[var(--txt2)] uppercase bg-[var(--bg2)] rounded-lg px-3 py-1.5 inline-block">
              VS
            </div>
          )}
        </div>

        {/* Team B side */}
        <div className="text-left overflow-hidden">
          <div className={`font-bold text-base text-[var(--txt)] mb-1 truncate px-1 ${isTeamBLoser ? 'line-through text-[var(--txt2)] font-semibold opacity-75' : ''}`}>
            {activeFixture.team_b_name}
          </div>
          {isCompleted && scorersTeamB.length > 0 && (
            <div className="space-y-0.5">
              {scorersTeamB.map((s, i) => (
                <div key={i} className="text-xs text-[var(--txt2)] font-medium">
                  ⚽ {s.player_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit action */}
      {editable && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] text-right">
          <button
            type="button"
            onClick={() => onEdit(activeFixture)}
            className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-orange-100 transition-colors"
          >
            ✏️ {isCompleted ? 'Edit Result' : 'Enter Result'}
          </button>
        </div>
      )}
    </div>
  );
}
