import { Calendar, MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WhatsAppShareButton from './WhatsAppShareButton';

export default function FixtureCard({ fixture, tournamentName, tournamentId }) {
  const { t } = useTranslation();

  return (
    <div className="bg-[var(--card)] rounded-lg shadow-sm border border-[var(--border)] p-4 mb-4 hover:border-primary-500 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-md uppercase tracking-wider">
          {fixture.stage}
        </span>
        <WhatsAppShareButton 
          match={fixture} 
          tournamentName={tournamentName} 
          tournamentId={tournamentId} 
          isFixture={true}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <p className="font-bold text-lg truncate">{fixture.team_a_name || 'TBD'}</p>
        </div>
        <div className="px-4">
          <span className="text-sm font-bold text-[var(--txt2)] px-3 py-1 bg-[var(--bg2)] rounded-full">VS</span>
        </div>
        <div className="flex-1 text-center">
          <p className="font-bold text-lg truncate">{fixture.team_b_name || 'TBD'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--txt2)] pt-3 border-t border-[var(--border)]">
        {fixture.match_date && (
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>{fixture.match_date}</span>
          </div>
        )}
        {fixture.match_time && (
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{fixture.match_time}</span>
          </div>
        )}
        {fixture.venue && (
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span>{fixture.venue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
