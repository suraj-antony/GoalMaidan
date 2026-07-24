import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import LeagueTable from '../../components/LeagueTable';
import KnockoutBracket from '../../components/KnockoutBracket';
import MatchCard from '../../components/MatchCard';
import FixtureCard from '../../components/FixtureCard';
import WhatsAppShareButton from '../../components/WhatsAppShareButton';
import { Trophy, List, Calendar, Star, Lock } from 'lucide-react';

const TABS = [
  { key: 'table', label: 'Table / Bracket', icon: List },
  { key: 'fixtures', label: 'Fixtures', icon: Calendar },
  { key: 'results', label: 'Results', icon: Trophy },
  { key: 'awards', label: 'Awards', icon: Star },
];

export default function TournamentView() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [table, setTable] = useState([]);
  const [awards, setAwards] = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState('table');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, fRes] = await Promise.all([
          api.get(`/tournaments/${id}/`),
          api.get(`/fixtures/?tournament=${id}`),
        ]);
        setTournament(tRes.data);
        setFixtures(fRes.data);

        // Fetch league table if league type
        if (tRes.data.tournament_type === 'league') {
          const tableRes = await api.get(`/awards/table/?tournament=${id}`);
          setTable(tableRes.data);
        }

        // Fetch awards
        const [aRes, sRes] = await Promise.all([
          api.get(`/awards/?tournament=${id}`),
          api.get(`/awards/top-scorers/?tournament=${id}`),
        ]);
        setAwards(aRes.data);
        setTopScorers(sRes.data);

      } catch (err) {
        if (err.response?.status === 403) setAccessDenied(true);
        else console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRequestAccess = async () => {
    try {
      await api.post('/teams/access-requests/', { tournament: id });
      alert('Access request sent to the organiser!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error sending request');
    }
  };

  if (loading) return <div className="text-center py-32 text-[var(--txt2)]">Loading tournament...</div>;

  if (accessDenied) return (
    <div className="max-w-md mx-auto mt-32 text-center p-8 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg">
      <Lock size={48} className="mx-auto text-orange-400 mb-4" />
      <h2 className="text-2xl font-bold mb-2">{t('access_restricted')}</h2>
      <p className="text-[var(--txt2)] mb-6">This is a private tournament. Request access from the organiser to view it.</p>
      {user && (
        <button
          onClick={handleRequestAccess}
          className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors"
        >
          🔑 {t('request_access')}
        </button>
      )}
    </div>
  );

  if (!tournament) return <div className="text-center py-32 text-red-500">Tournament not found.</div>;

  const upcomingFixtures = fixtures.filter(f => f.status !== 'completed');
  const completedFixtures = fixtures.filter(f => f.status === 'completed');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Tournament Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white mb-8 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-full">{tournament.ground_type}</span>
              <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-full">{tournament.tournament_type}</span>
              <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-full">{tournament.age_category}</span>
              {tournament.status === 'live' && (
                <span className="px-2 py-0.5 bg-red-500 text-xs font-bold rounded-full animate-pulse">🔴 LIVE</span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="opacity-80 mt-1">{tournament.area_name || ''}</p>
          </div>
          <div className="text-5xl">⚽</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg2)] p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${activeTab === tab.key ? 'bg-[var(--card)] text-primary-600 shadow-sm' : 'text-[var(--txt2)] hover:text-[var(--txt)]'}`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table / Bracket Tab */}
      {activeTab === 'table' && (
        <div>
          {tournament.tournament_type === 'league' ? (
            <>
              <h2 className="text-xl font-bold mb-4">{t('league_table')}</h2>
              <LeagueTable tableData={table} />
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">Knockout Bracket</h2>
              <KnockoutBracket fixtures={fixtures} />
            </>
          )}
        </div>
      )}

      {/* Fixtures Tab */}
      {activeTab === 'fixtures' && (
        <div>
          <h2 className="text-xl font-bold mb-4">{t('fixture')} ({upcomingFixtures.length})</h2>
          {upcomingFixtures.length === 0 ? (
            <div className="text-center py-12 text-[var(--txt2)]">No upcoming fixtures</div>
          ) : (
            upcomingFixtures.map(f => (
              <FixtureCard key={f.id} fixture={f} tournamentName={tournament.name} tournamentId={id} />
            ))
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('results')} ({completedFixtures.length})</h2>
          </div>
          {completedFixtures.length === 0 ? (
            <div className="text-center py-12 text-[var(--txt2)]">No results yet</div>
          ) : (
            completedFixtures.map(f => (
              <MatchCard key={f.id} match={f} tournamentName={tournament.name} tournamentId={id} />
            ))
          )}

          {/* Top Scorers */}
          {topScorers.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">{t('top_scorers')}</h3>
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
                {topScorers.map((scorer, i) => (
                  <div key={scorer.player_id || i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)] transition-colors">
                    <span className={`text-lg font-bold w-7 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-[var(--txt2)]'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{scorer.player_name}</p>
                      <p className="text-xs text-[var(--txt2)]">{scorer.team_name}</p>
                    </div>
                    <span className="text-xl font-bold text-primary-600">{scorer.goals} ⚽</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Awards Tab */}
      {activeTab === 'awards' && (
        <div>
          <h2 className="text-xl font-bold mb-4">{t('awards')}</h2>
          {awards.length === 0 ? (
            <div className="text-center py-12 text-[var(--txt2)]">No awards declared yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {awards.map(award => (
                <div key={award.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-all">
                  <div className="text-3xl">
                    {award.award_type === 'best_player' ? '🌟' :
                     award.award_type === 'top_scorer' ? '⚽' :
                     award.award_type === 'best_goalkeeper' ? '🧤' :
                     award.award_type === 'best_defender' ? '🛡️' :
                     award.award_type === 'emerging_player' ? '🌱' : '🏆'}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt2)]">{award.award_type?.replace('_', ' ')}</p>
                    <p className="font-bold text-lg mt-0.5">{award.player_name}</p>
                    <p className="text-sm text-[var(--txt2)]">{award.team_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
