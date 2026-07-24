import { useTranslation } from 'react-i18next';
import WhatsAppShareButton from './WhatsAppShareButton';

export default function MatchCard({ match, tournamentName, tournamentId }) {
  const { t } = useTranslation();

  return (
    <div className="bg-[var(--card)] rounded-lg shadow-sm border border-[var(--border)] p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold px-2 py-1 bg-[var(--bg2)] rounded-md text-[var(--txt2)] uppercase tracking-wider">
          {match.stage} - {t('results')}
        </span>
        <WhatsAppShareButton 
          match={match} 
          tournamentName={tournamentName} 
          tournamentId={tournamentId} 
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex-1 text-center">
          <p className="font-bold text-lg truncate px-2">{match.team_a_name}</p>
        </div>
        
        <div className="px-4 flex items-center justify-center gap-3">
          <span className="text-2xl font-bold bg-primary-500 text-white w-10 h-10 flex items-center justify-center rounded-md">
            {match.score_a}
          </span>
          <span className="text-sm font-medium text-[var(--txt2)]">-</span>
          <span className="text-2xl font-bold bg-primary-500 text-white w-10 h-10 flex items-center justify-center rounded-md">
            {match.score_b}
          </span>
        </div>

        <div className="flex-1 text-center">
          <p className="font-bold text-lg truncate px-2">{match.team_b_name}</p>
        </div>
      </div>

      {match.events && match.events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-sm font-semibold mb-2 text-[var(--txt2)]">{t('goals')}</p>
          <ul className="text-sm space-y-1">
            {match.events.filter(e => e.event_type === 'goal').map(event => (
              <li key={event.id} className="flex items-center gap-2">
                <span>⚽</span>
                <span>{event.player_name}{event.minute ? ` (${event.minute}')` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
