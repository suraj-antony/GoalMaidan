import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import LeagueTable from '../../components/LeagueTable';
import { BracketView } from '../../components/BracketView';
import MatchCard from '../../components/MatchCard';
import FixtureCard from '../../components/FixtureCard';
import WhatsAppShareButton from '../../components/WhatsAppShareButton';
import { Trophy, List, Calendar, Star, Lock, BarChart2 } from 'lucide-react';

const TABS = [
  { key: 'table', label: 'Table / Bracket', icon: List },
  { key: 'fixtures', label: 'Fixtures', icon: Calendar },
  { key: 'results', label: 'Results', icon: Trophy },
  { key: 'stats', label: 'Stats', icon: BarChart2 },
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
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState('table');

  const getTournamentWinner = () => {
    if (tournament?.status !== 'completed') return null;

    if (tournament.tournament_type === 'league') {
      if (table && table.length > 0) {
        return table[0].team_name;
      }
    } else {
      const finalFixture = fixtures.find(f => f.stage === 'final' && f.status === 'completed');
      if (finalFixture) {
        if (finalFixture.winner_name) return finalFixture.winner_name;
        const scoreA = Number(finalFixture.score_a);
        const scoreB = Number(finalFixture.score_b);
        if (scoreA > scoreB) {
          return finalFixture.team_a_name;
        } else if (scoreB > scoreA) {
          return finalFixture.team_b_name;
        }
      }
    }
    return null;
  };

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

        // Fetch awards and stats
        const [aRes, statsRes] = await Promise.all([
          api.get(`/awards/?tournament=${id}`),
          api.get(`/awards/${id}/all/`),
        ]);
        setAwards(aRes.data);
        setScorers(statsRes.data.scorers || []);
        setAssists(statsRes.data.assists || []);
        setContributions(statsRes.data.goal_contributions || []);

      } catch (err) {
        if (err.response?.status === 403) setAccessDenied(true);
        else console.error(err);
      } finally {
        setLoading(false);
        setStatsLoading(false);
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

      {getTournamentWinner() && (
        <div style={{
          background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)',
          border: '2px solid #eab308',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(234,179,8,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '24px',
        }}>
          <span style={{ fontSize: '48px', lineHeight: '1' }}>🏆</span>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tournament Champion
          </h2>
          <p style={{ fontSize: '28px', fontWeight: '950', color: '#1e293b', marginTop: '4px' }}>
            {getTournamentWinner()}
          </p>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#854d0e', opacity: 0.85 }}>
            Congratulations to the winners of {tournament.name}! 🎉
          </p>
        </div>
      )}

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
              <LeagueTable tableData={table} isLeagueCompleted={tournament.status === 'completed' && tournament.tournament_type === 'league'} />
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">Knockout Bracket</h2>
              <BracketView tournamentId={tournament.id} editable={false} />
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

        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold mb-4">Tournament Stats</h2>
          {statsLoading ? (
            <div className="text-center py-12 text-[var(--txt2)]">Loading stats...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <TopScorersTable scorers={scorers} />
              <TopAssistsTable assists={assists} />
              <GoalContributionsTable contributions={contributions} />
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
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt2)]">{award.award_type?.replace(/_/g, ' ')}</p>
                    {award.award_type === 'best_team' ? (
                      <p className="font-bold text-lg mt-0.5">{award.team_name}</p>
                    ) : (
                      <>
                        <p className="font-bold text-lg mt-0.5">{award.player_name || award.player_display_name}</p>
                        {award.team_name && <p className="text-sm text-[var(--txt2)]">{award.team_name}</p>}
                      </>
                    )}
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

// Helper components for stats tables
const TOP_N = 5;
const MEDAL = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

const TopScorersTable = ({ scorers }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? scorers : (scorers || []).slice(0, TOP_N);
  const hasMore = (scorers || []).length > TOP_N;

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col justify-between shadow-sm">
      <div>
        <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--txt)]">⚽ Top Scorers</h3>
        </div>
        {!scorers || scorers.length === 0 ? (
          <div className="px-4 py-5 text-center text-[var(--txt2)] text-xs">No goals recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg2)]">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)] w-8">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)]">Player</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)]">Team</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-[var(--txt2)] w-14">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map((s, i) => (
                <tr key={i} className={i === 0 ? 'bg-yellow-50/20' : 'hover:bg-[var(--bg2)]'}>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {MEDAL(i) || <span className="text-[var(--txt2)] text-[11px]">{i + 1}</span>}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-[var(--txt)]">{s.player_name}</td>
                  <td className="px-3 py-1.5 text-[var(--txt2)]">{s.team_name}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-green-600">{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {hasMore && (
        <div className="px-3 py-2 border-t border-[var(--border)] text-center bg-[var(--bg2)]">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full py-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100/50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </div>
  );
};

const TopAssistsTable = ({ assists }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? assists : (assists || []).slice(0, TOP_N);
  const hasMore = (assists || []).length > TOP_N;

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col justify-between shadow-sm">
      <div>
        <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--txt)]">🅰️ Top Assists</h3>
        </div>
        {!assists || assists.length === 0 ? (
          <div className="px-4 py-5 text-center text-[var(--txt2)] text-xs">No assists recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg2)]">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)] w-8">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)]">Player</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)]">Team</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-[var(--txt2)] w-16">Assists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map((a, i) => (
                <tr key={i} className={i === 0 ? 'bg-blue-50/20' : 'hover:bg-[var(--bg2)]'}>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {MEDAL(i) || <span className="text-[var(--txt2)] text-[11px]">{i + 1}</span>}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-[var(--txt)]">{a.player_name}</td>
                  <td className="px-3 py-1.5 text-[var(--txt2)]">{a.team_name}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-blue-700">{a.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {hasMore && (
        <div className="px-3 py-2 border-t border-[var(--border)] text-center bg-[var(--bg2)]">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full py-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100/50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </div>
  );
};

const GoalContributionsTable = ({ contributions }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? contributions : (contributions || []).slice(0, TOP_N);
  const hasMore = (contributions || []).length > TOP_N;

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col justify-between shadow-sm">
      <div>
        <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--txt)]">🎯 Goal Contributions</h3>
            <p className="text-[10px] text-[var(--txt2)]">Goals + Assists</p>
          </div>
        </div>
        {!contributions || contributions.length === 0 ? (
          <div className="px-4 py-5 text-center text-[var(--txt2)] text-xs">No contributions recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg2)]">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)] w-8">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)]">Player</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--txt2)]">Team</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-[var(--txt2)] w-14">G+A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map((c, i) => (
                <tr key={i} className={i === 0 ? 'bg-purple-50/20' : 'hover:bg-[var(--bg2)]'}>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {MEDAL(i) || <span className="text-[var(--txt2)] text-[11px]">{i + 1}</span>}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-[var(--txt)]">{c.player_name}</td>
                  <td className="px-3 py-1.5 text-[var(--txt2)]">{c.team_name}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-purple-600">{c.goals + c.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {hasMore && (
        <div className="px-3 py-2 border-t border-[var(--border)] text-center bg-[var(--bg2)]">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full py-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100/50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </div>
  );
};
