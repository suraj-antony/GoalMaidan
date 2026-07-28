import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { 
  Trophy, Users, Calendar, Award, Info, 
  TrendingUp, Activity, ShieldCheck, Mail, Globe, Lock, ArrowLeft 
} from 'lucide-react';

const ageLabels = {
  U7: 'Under 7', U8: 'Under 8', U9: 'Under 9', U10: 'Under 10', U11: 'Under 11',
  U12: 'Under 12', U13: 'Under 13', U14: 'Under 14', U15: 'Under 15', U16: 'Under 16',
  U17: 'Under 17', U18: 'Under 18', U19: 'Under 19', U20: 'Under 20', U21: 'Under 21',
  U22: 'Under 22', U23: 'Under 23', Open: 'Open', Veterans: 'Veterans (40+)'
};

const typeLabels = {
  league: 'League Only',
  knockout: 'Knockout Only',
  league_knockout: 'League + Knockout'
};

const statusConfig = {
  draft: { label: 'DRAFT', classes: 'bg-gray-150 text-gray-700 border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' },
  active: { label: 'ACTIVE', classes: 'bg-emerald-105 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50' },
  completed: { label: 'COMPLETED', classes: 'bg-blue-105 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50' }
};

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [stats, setStats] = useState({
    top_scorers: [],
    top_assists: [],
    league_table: [],
    match_awards: [],
    tournament_awards: []
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTournamentWinner = () => {
    if (tournament?.status !== 'completed') return null;

    if (tournament.tournament_type === 'league') {
      if (stats?.league_table && stats.league_table.length > 0) {
        return stats.league_table[0].team_name || stats.league_table[0].team?.name;
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
    const fetchTournamentData = async () => {
      try {
        setLoading(true);
        // Fetch tournament main details
        const detailRes = await api.get(`/tournaments/${id}/`);
        setTournament(detailRes.data);

        // Fetch fixtures
        try {
          const fixturesRes = await api.get(`/fixtures/?tournament=${id}`);
          setFixtures(fixturesRes.data);
        } catch (fErr) {
          console.error('Failed to fetch fixtures', fErr);
        }

        // Fetch stats & standings & awards
        try {
          const statsRes = await api.get(`/stats/${id}/all/`);
          setStats(statsRes.data);
        } catch (sErr) {
          console.error('Failed to fetch stats', sErr);
        }

      } catch (err) {
        console.error(err);
        setError('Failed to load tournament detail. It may not exist or you might not have access.');
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--txt2)]">
        <div className="animate-spin text-5xl mb-4 text-green-700 font-bold">⚽</div>
        <p className="font-semibold text-lg">Loading tournament details...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-center">
        <p className="text-lg font-bold mb-4">{error || 'Tournament not found'}</p>
        <Link to="/dashboard" className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-800 transition-colors inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate Goal Contributions dynamically
  const contributionsMap = {};
  stats.top_scorers.forEach(s => {
    contributionsMap[s.player_name] = { 
      player_name: s.player_name, 
      team_name: s.team_name, 
      goals: s.goals, 
      assists: 0, 
      total: s.goals 
    };
  });
  stats.top_assists.forEach(a => {
    if (contributionsMap[a.player_name]) {
      contributionsMap[a.player_name].assists = a.assists;
      contributionsMap[a.player_name].total += a.assists;
    } else {
      contributionsMap[a.player_name] = { 
        player_name: a.player_name, 
        team_name: a.team_name, 
        goals: 0, 
        assists: a.assists, 
        total: a.assists 
      };
    }
  });
  const goalContributions = Object.values(contributionsMap).sort((a, b) => b.total - a.total);

  // Tab definitions
  const showLeagueTab = ['league', 'league_knockout'].includes(tournament.tournament_type);

  const statusInfo = statusConfig[tournament.status] || { label: tournament.status.toUpperCase(), classes: 'bg-gray-100 text-gray-700 border-gray-300' };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700 hover:underline mb-6">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Header Info */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 shadow-md mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center flex-wrap gap-2.5 mb-2.5">
              <StatusBadge status={tournament.status} />
              <span className="text-xs font-semibold text-[var(--txt2)]">📍 {tournament.area_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--txt)] tracking-tight">
              {tournament.name}
            </h1>
          </div>
          
          {/* Action button if public */}
          <Link
            to={`/tournament/${tournament.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold border border-[var(--border)] hover:bg-[var(--bg2)] rounded-xl transition-all shadow-sm"
          >
            <Globe size={16} /> Public Page
          </Link>
        </div>

        {/* Top badges row */}
        <div className="flex flex-wrap gap-2.5 mt-5 pt-5 border-t border-[var(--border)]">
          <span className="px-3.5 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-305 text-xs font-extrabold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
            Ground: {tournament.ground_type}
          </span>
          <span className="px-3.5 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-305 text-xs font-extrabold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
            Age: {ageLabels[tournament.age_category] || tournament.age_category}
          </span>
          <span className="px-3.5 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-305 text-xs font-extrabold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
            Format: {typeLabels[tournament.tournament_type] || tournament.tournament_type}
          </span>
          <span className="px-3.5 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-305 text-xs font-extrabold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
            Max Teams: {tournament.max_teams}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] mb-8 overflow-x-auto whitespace-nowrap">
        {[
          { key: 'overview', label: 'Overview', icon: Info },
          { key: 'teams', label: 'Teams', icon: Users },
          { key: 'fixtures', label: 'Fixtures', icon: Calendar },
          ...(showLeagueTab ? [{ key: 'league', label: 'League Table', icon: Trophy }] : []),
          { key: 'stats', label: 'Stats', icon: TrendingUp },
          { key: 'awards', label: 'Awards', icon: Award }
        ].map(tab => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer
                ${isSelected 
                  ? 'border-green-700 text-green-700 font-extrabold' 
                  : 'border-transparent text-[var(--txt2)] hover:text-[var(--txt)]'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-md p-6 sm:p-8 min-h-[300px]">
        
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
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

            <h2 className="text-xl font-extrabold text-[var(--txt)] mb-4">Overview & Info</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[
                  ['Name', tournament.name],
                  ['Area', tournament.area_name || 'Not Specified'],
                  ['Age Restriction', ageLabels[tournament.age_category] || tournament.age_category],
                  ['Format', typeLabels[tournament.tournament_type] || tournament.tournament_type],
                  ['Max Teams Allowed', `${tournament.max_teams} teams`],
                  ['Home & Away Phase', tournament.home_and_away ? 'Enabled' : 'Disabled'],
                  ['Knockout Qualifiers', tournament.tournament_type === 'league_knockout' ? `${tournament.knockout_qualifiers} teams` : 'N/A'],
                  ['Third Place Playoff', (tournament.tournament_type === 'knockout' || tournament.tournament_type === 'league_knockout') ? (tournament.third_place_option ? 'Enabled' : 'Disabled') : 'N/A']
                ].map(([lbl, val]) => (
                  <div key={lbl} className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-sm font-semibold text-[var(--txt2)]">{lbl}</span>
                    <span className="text-sm font-extrabold text-[var(--txt)]">{val}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-[var(--border)] h-fit">
                <h3 className="font-extrabold text-sm text-[var(--txt)] uppercase tracking-wider mb-3">Verification & Security</h3>
                
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-xs font-semibold text-[var(--txt2)]">Age Verification required</span>
                  <span className="text-xs font-extrabold text-[var(--txt)]">{tournament.age_verification_required ? 'Yes ✅' : 'No ❌'}</span>
                </div>
                
                {tournament.age_verification_required && (
                  <div className="pl-3 space-y-1 text-xs text-[var(--txt)]">
                    <p className="font-semibold text-[var(--txt2)]">Accepted Documents:</p>
                    <ul className="list-disc pl-4 space-y-0.5 font-bold">
                      {tournament.accept_aadhaar && <li>Aadhaar card</li>}
                      {tournament.accept_school_certificate && <li>School certificate</li>}
                      {tournament.accept_birth_certificate && <li>Birth certificate</li>}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-xs font-semibold text-[var(--txt2)]">Privacy Access Mode</span>
                  <span className="text-xs font-extrabold text-[var(--txt)]">
                    {tournament.is_private ? 'Private 🔒' : 'Open 🌐'}
                  </span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-xs font-semibold text-[var(--txt2)]">Public Stats visible</span>
                  <span className="text-xs font-extrabold text-[var(--txt)]">{tournament.public_stats ? 'Yes ✅' : 'No ❌'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TEAMS ================= */}
        {activeTab === 'teams' && (
          <div>
            <h2 className="text-xl font-extrabold text-[var(--txt)] mb-4">Teams Registered ({tournament.teams?.length || 0})</h2>
            
            {(!tournament.teams || tournament.teams.length === 0) ? (
              <div className="text-center py-12 text-[var(--txt2)]">
                <p className="font-semibold">No teams added yet.</p>
                <p className="text-xs mt-1">Go to Manage page to register teams and players.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tournament.teams.map(team => (
                  <div key={team.id} className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-[var(--border)] rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl flex items-center justify-center font-bold">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-[var(--txt)]">{team.name}</p>
                        <p className="text-xs text-[var(--txt2)] font-semibold">Manager: {team.manager_name || 'N/A'}</p>
                      </div>
                    </div>
                    <span className="bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-lg font-bold">
                      {team.player_count || 0} players
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: FIXTURES ================= */}
        {activeTab === 'fixtures' && (
          <div>
            <h2 className="text-xl font-extrabold text-[var(--txt)] mb-4">fixtures & schedules ({fixtures.length})</h2>
            
            {fixtures.length === 0 ? (
              <div className="text-center py-12 text-[var(--txt2)]">
                <p className="font-semibold">No fixtures generated or added yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fixtures.map(f => (
                  <div key={f.id} className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-[var(--border)] rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex-1 text-right font-extrabold text-sm sm:text-base text-[var(--txt)]">
                      {f.team_a?.name || 'TBD'}
                    </div>
                    <div className="px-4 text-center">
                      <span className="text-xs font-bold text-[var(--txt2)] uppercase tracking-wider block mb-1">
                        {f.stage}
                      </span>
                      <div className="inline-block px-3 py-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-sm font-extrabold text-[var(--txt)]">
                        {f.status === 'completed' ? `${f.score_a} - ${f.score_b}` : 'VS'}
                      </div>
                      <span className="text-[10px] text-[var(--txt2)] block mt-1.5 font-medium">
                        {f.match_date || 'No Date'} · {f.match_time || 'No Time'}
                      </span>
                    </div>
                    <div className="flex-1 text-left font-extrabold text-sm sm:text-base text-[var(--txt)]">
                      {f.team_b?.name || 'TBD'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: LEAGUE TABLE ================= */}
        {activeTab === 'league' && showLeagueTab && (
          <div>
            <h2 className="text-xl font-extrabold text-[var(--txt)] mb-4">League Standings</h2>
            
            {!stats.league_table || stats.league_table.length === 0 ? (
              <div className="text-center py-12 text-[var(--txt2)]">
                <p className="font-semibold">No standings records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border border-[var(--border)] rounded-xl overflow-hidden animate-fade-in">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-xs font-extrabold text-[var(--txt2)] uppercase border-b border-[var(--border)]">
                    <tr>
                      <th className="p-3">Pos</th>
                      <th className="p-3">Team</th>
                      <th className="p-3 text-center">P</th>
                      <th className="p-3 text-center">W</th>
                      <th className="p-3 text-center">D</th>
                      <th className="p-3 text-center">L</th>
                      <th className="p-3 text-center">GD</th>
                      <th className="p-3 text-center">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {stats.league_table.map((row, index) => {
                      const isFirst = index === 0;
                      return (
                        <tr 
                          key={row.id || index} 
                          className={isFirst 
                            ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20" 
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"}
                        >
                          <td 
                            className={`p-3 font-extrabold ${isFirst ? 'text-amber-600' : 'text-zinc-500'}`}
                            style={{ borderLeft: isFirst ? '4px solid #eab308' : '4px solid transparent' }}
                          >
                            {isFirst ? '🥇' : index + 1}
                          </td>
                          <td className="p-3 font-extrabold text-[var(--txt)]">
                            {row.team_name || row.team?.name || 'Team'}
                            {tournament.status === 'completed' && tournament.tournament_type === 'league' && isFirst && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-black bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/60 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                🏆 Winner
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-medium">{row.played}</td>
                          <td className="p-3 text-center text-green-700 font-semibold">{row.won}</td>
                          <td className="p-3 text-center text-zinc-600 font-semibold">{row.drawn}</td>
                          <td className="p-3 text-center text-red-600 font-semibold">{row.lost}</td>
                          <td className="p-3 text-center font-medium">{(row.goals_for - row.goals_against)}</td>
                          <td className="p-3 text-center font-extrabold text-[var(--txt)]">{row.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: STATS ================= */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            <h2 className="text-xl font-extrabold text-[var(--txt)] mb-4">Player Leaderboards</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Scorers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-2">
                  <span className="text-xl">⚽</span>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--txt)]">Top Scorers</h3>
                </div>
                
                {stats.top_scorers.length === 0 ? (
                  <p className="text-xs text-[var(--txt2)] italic py-2">No goals scored yet</p>
                ) : (
                  stats.top_scorers.slice(0, 10).map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-[var(--border)] text-sm">
                      <div>
                        <p className="font-extrabold text-[var(--txt)]">{s.player_name}</p>
                        <p className="text-xs text-[var(--txt2)] font-semibold">{s.team_name}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-705 font-extrabold rounded-lg text-xs">
                        {s.goals} Goals
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Top Assists */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-2">
                  <span className="text-xl">🅰️</span>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--txt)]">Top Assists</h3>
                </div>

                {stats.top_assists.length === 0 ? (
                  <p className="text-xs text-[var(--txt2)] italic py-2">No assists recorded yet</p>
                ) : (
                  stats.top_assists.slice(0, 10).map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-[var(--border)] text-sm">
                      <div>
                        <p className="font-extrabold text-[var(--txt)]">{a.player_name}</p>
                        <p className="text-xs text-[var(--txt2)] font-semibold">{a.team_name}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-705 font-extrabold rounded-lg text-xs">
                        {a.assists} Assists
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Goal Contributions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-2">
                  <span className="text-xl">📈</span>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--txt)]">Goal Contributions</h3>
                </div>

                {goalContributions.length === 0 ? (
                  <p className="text-xs text-[var(--txt2)] italic py-2">No stats recorded yet</p>
                ) : (
                  goalContributions.slice(0, 10).map((gc, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-[var(--border)] text-sm">
                      <div>
                        <p className="font-extrabold text-[var(--txt)]">{gc.player_name}</p>
                        <p className="text-xs text-[var(--txt2)] font-semibold">{gc.team_name}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-705 font-extrabold rounded-lg text-xs">
                        {gc.total} (G:{gc.goals} + A:{gc.assists})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: AWARDS ================= */}
        {activeTab === 'awards' && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-[var(--txt)] mb-4">Tournament Awards</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Match Awards */}
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--txt2)] border-b border-[var(--border)] pb-2 mb-4">
                  Match Awards (MOTM etc)
                </h3>
                {!stats.match_awards || stats.match_awards.length === 0 ? (
                  <p className="text-xs text-[var(--txt2)] italic">No match awards given yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.match_awards.map(ma => {
                      const label = ma.award_type ? ma.award_type.toUpperCase().replace(/_/g, ' ') : 'MATCH AWARD';
                      return (
                        <div key={ma.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)] text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold text-[var(--txt)]">{label}</p>
                            <p className="text-[var(--txt2)]">Player: {ma.player_name || ma.player_display_name || ma.player?.name}</p>
                          </div>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-extrabold">Match Award</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tournament-wide Awards */}
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--txt2)] border-b border-[var(--border)] pb-2 mb-4">
                  Tournament-Wide Awards
                </h3>
                {!stats.tournament_awards || stats.tournament_awards.length === 0 ? (
                  <p className="text-xs text-[var(--txt2)] italic">No tournament-wide awards declared yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.tournament_awards.map(ta => {
                      const label = ta.award_type ? ta.award_type.toUpperCase().replace(/_/g, ' ') : 'MAJOR AWARD';
                      return (
                        <div key={ta.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)] text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold text-[var(--txt)]">{label}</p>
                            {ta.award_type === 'best_team' ? (
                              <p className="text-[var(--txt2)]">Team: {ta.team_name}</p>
                            ) : (
                              <>
                                <p className="text-[var(--txt2)]">Player: {ta.player_name || ta.player_display_name || ta.player?.name}</p>
                                {ta.team_name && <p className="text-xs text-[var(--txt2)]">Team: {ta.team_name}</p>}
                              </>
                            )}
                          </div>
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-extrabold">🏆 Major Award</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
