import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Calendar, Trash2, Edit2, Play, CheckCircle, RotateCcw, AlertCircle, Info, Shuffle } from 'lucide-react';
import api from '../../api/axios';
import MatchResultModal from '../../components/MatchResultModal';
import StatusBadge from '../../components/StatusBadge';
import { BracketView } from '../../components/BracketView';

const ageLabels = {
  U7: 'Under 7', U8: 'Under 8', U9: 'Under 9', U10: 'Under 10', U11: 'Under 11',
  U12: 'Under 12', U13: 'Under 13', U14: 'Under 14', U15: 'Under 15', U16: 'Under 16',
  U17: 'Under 17', U18: 'Under 18', U19: 'Under 19', U20: 'Under 20', U21: 'Under 21',
  U22: 'Under 22', U23: 'Under 23', Open: 'Open', Veterans: 'Veterans (40+)'
};

const typeLabels = {
  league: 'League',
  knockout: 'Knockout',
  league_knockout: 'League + KO'
};


// Renders a mini standings table for a single group or all teams
const GroupStandingsTable = ({ title, rows, qualifiers }) => {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h4 className="text-sm font-extrabold text-gray-900">📊 {title}</h4>
        {qualifiers > 0 && (
          <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
            Top {qualifiers} qualify
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8">Pos</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Team</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-8">P</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-8">W</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-8">D</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-8">L</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-10">GF</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-10">GA</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-10">GD</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-10">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => {
              const gd = row.goal_difference ?? (row.goals_for - row.goals_against);
              const isQualifier = qualifiers > 0 && i < qualifiers;
              const teamKey = row.team || row.team_id || i;
              return (
                <tr key={teamKey}
                  className={isQualifier ? 'bg-green-50/30' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                >
                  <td 
                    className="px-3 py-2.5 text-center font-bold text-gray-400"
                    style={{ borderLeft: isQualifier ? '4px solid var(--green)' : '4px solid transparent' }}
                  >
                    {i + 1}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900">
                    {row.team_name}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{row.played}</td>
                  <td className="px-3 py-2.5 text-center text-green-700 font-medium">{row.won}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{row.drawn}</td>
                  <td className="px-3 py-2.5 text-center text-red-500">{row.lost}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{row.goals_for}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{row.goals_against}</td>
                  <td className={`px-3 py-2.5 text-center font-medium ${gd > 0 ? 'text-green-600' : gd < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {gd > 0 ? '+' : ''}{gd}
                  </td>
                  <td className="px-3 py-2.5 text-center font-extrabold text-gray-900">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StandingsSection = ({ table, groups, tournament }) => {
  const isMultiGroup = tournament?.tournament_type === 'league_knockout' && tournament?.league_knockout_style === 'multi_group';
  const hasGroups = isMultiGroup && groups && groups.length > 0;

  if (!hasGroups) {
    // No groups: show a single overall standings table
    const qualifiers = tournament?.tournament_type === 'league_knockout'
      ? (tournament?.knockout_qualifiers || 4)
      : 0;
    return (
      <GroupStandingsTable title="Standings Table" rows={table} qualifiers={qualifiers} />
    );
  }

  const qualifiersPerGroup = tournament?.qualifiers_per_group || 2;

  // Map team IDs -> group name from the groups structure
  const teamGroupMap = {};
  groups.forEach(g => {
    (g.teams || []).forEach(t => {
      const tid = typeof t === 'object' ? t.id : t;
      teamGroupMap[String(tid)] = g.name;
    });
  });

  // Group the standings rows by their group
  const grouped = {};
  (table || []).forEach(row => {
    const teamId = row.team || row.team_id;
    const gname = teamGroupMap[String(teamId)] || 'Other';
    if (!grouped[gname]) grouped[gname] = [];
    grouped[gname].push(row);
  });

  // Sort group names alphabetically
  const groupNames = Object.keys(grouped).sort();

  if (groupNames.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-8 text-center text-gray-400 text-sm shadow-sm">
        No matches completed yet. Standings will appear here after results are entered.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-extrabold text-gray-900">📊 Group Standings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupNames.map(gname => (
          <GroupStandingsTable
            key={gname}
            title={gname.length === 1 ? `Grp. ${gname}` : gname}
            rows={grouped[gname]}
            qualifiers={qualifiersPerGroup}
          />
        ))}
      </div>
    </div>
  );
};



const MEDAL = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
const TOP_N = 5;

const TopScorersTable = ({ scorers }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? scorers : (scorers || []).slice(0, TOP_N);
  const hasMore = (scorers || []).length > TOP_N;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">⚽ Top Scorers</h3>
        </div>
        {!scorers || scorers.length === 0 ? (
          <div className="px-4 py-5 text-center text-gray-400 text-xs">No goals recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400 w-8">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Player</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Team</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-400 w-14">⚽ Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((s, i) => (
                <tr key={i} className={i === 0 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {MEDAL(i) || <span className="text-gray-400 text-[11px]">{i + 1}</span>}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-gray-900">{s.player_name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{s.team_name}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-green-700">{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {hasMore && (
        <div className="px-3 py-2 border-t border-gray-100 text-center bg-gray-50/50">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full py-1 text-xs font-bold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </div>
  );
};

const TopAssistsTable = ({ assists }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? assists : (assists || []).slice(0, TOP_N);
  const hasMore = (assists || []).length > TOP_N;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">🅰️ Top Assists</h3>
        </div>
        {!assists || assists.length === 0 ? (
          <div className="px-4 py-5 text-center text-gray-400 text-xs">No assists recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400 w-8">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Player</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Team</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-400 w-16">🅰️ Assists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((a, i) => (
                <tr key={i} className={i === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {MEDAL(i) || <span className="text-gray-400 text-[11px]">{i + 1}</span>}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-gray-900">{a.player_name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{a.team_name}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-blue-700">{a.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {hasMore && (
        <div className="px-3 py-2 border-t border-gray-100 text-center bg-gray-50/50">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full py-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </div>
  );
};

const GoalContributionsTable = ({ contributions }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? contributions : (contributions || []).slice(0, TOP_N);
  const hasMore = (contributions || []).length > TOP_N;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">🎯 Goal Contributions</h3>
            <p className="text-[10px] text-gray-400">Goals + Assists</p>
          </div>
        </div>
        {!contributions || contributions.length === 0 ? (
          <div className="px-4 py-5 text-center text-gray-400 text-xs">No contributions recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400 w-8">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Player</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Team</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-400 w-10">⚽</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-400 w-10">🅰️</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-400 w-14">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((c, i) => (
                <tr key={i} className={i === 0 ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {MEDAL(i) || <span className="text-gray-400 text-[11px]">{i + 1}</span>}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-gray-900">{c.player_name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{c.team_name}</td>
                  <td className="px-3 py-1.5 text-center text-green-700 font-medium">{c.goals}</td>
                  <td className="px-3 py-1.5 text-center text-blue-700 font-medium">{c.assists}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-purple-700">{c.contributions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {hasMore && (
        <div className="px-3 py-2 border-t border-gray-100 text-center bg-gray-50/50">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full py-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </div>
  );
};


const getStartingKnockoutStage = (numTeams) => {
  if (numTeams <= 2) return 'final';
  if (numTeams <= 4) return 'semi';
  if (numTeams <= 8) return 'quarter';
  if (numTeams <= 16) return 'round_of_16';
  if (numTeams <= 32) return 'round_of_32';
  return 'round_of_64';
};

export default function TournamentManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Page state
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [table, setTable] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Modals & feedback
  const [resultModal, setResultModal] = useState(null); // holds fixture object
  const [activateModal, setActivateModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [reopenModal, setReopenModal] = useState(false);
  const [fixtureModal, setFixtureModal] = useState(null); // { mode: 'add'|'edit', data }
  const [regenerateFixturesModal, setRegenerateFixturesModal] = useState(false);
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [toast, setToast] = useState(null);

  // League completion and knockout generation state
  const [leagueStatus, setLeagueStatus] = useState(null);
  const [generatingKnockout, setGeneratingKnockout] = useState(false);
  const [knockoutSeedModal, setKnockoutSeedModal] = useState(false);
  const [seedOrder, setSeedOrder] = useState([]);
  const [manualMatches, setManualMatches] = useState([]);
  const [advancingRound, setAdvancingRound] = useState(false);

  // Tournament Awards state
  const [tournamentAwards, setTournamentAwards] = useState([]);
  const [awardInputs, setAwardInputs] = useState({}); // { award_type: { player_name, team_name } }
  const [savingAward, setSavingAward] = useState(null); // which award_type is currently saving

  // Teams editing sub-states
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamData, setEditingTeamData] = useState({});
  const [newTeam, setNewTeam] = useState({ name: '', manager_name: '', manager_phone: '' });
  const [bulkTeamsText, setBulkTeamsText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  // Player management sub-states
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [newPlayerInput, setNewPlayerInput] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');

  const handleAddPlayersToTeam = async (teamId) => {
    if (!newPlayerInput.trim()) return;
    const names = newPlayerInput
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    try {
      const res = await api.post('/teams/players/', { team: teamId, names });
      const addedPlayers = Array.isArray(res.data) ? res.data : [res.data];
      
      setTeams(prevTeams => prevTeams.map(t => {
        if (t.id === teamId) {
          const currentPlayers = t.players || [];
          const updatedPlayers = [...currentPlayers, ...addedPlayers];
          return { ...t, players: updatedPlayers, player_count: updatedPlayers.length };
        }
        return t;
      }));

      setNewPlayerInput('');
      showToast(`Added ${addedPlayers.length} player(s)!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add player(s).', 'error');
    }
  };

  const handleSaveEditPlayer = async (teamId, playerId) => {
    if (!editingPlayerName.trim()) return;
    try {
      const res = await api.put(`/teams/players/${playerId}/`, { name: editingPlayerName.trim() });
      setTeams(prevTeams => prevTeams.map(t => {
        if (t.id === teamId) {
          const updatedPlayers = (t.players || []).map(p => p.id === playerId ? { ...p, name: res.data.name } : p);
          return { ...t, players: updatedPlayers };
        }
        return t;
      }));
      setEditingPlayerId(null);
      setEditingPlayerName('');
      showToast('Player name updated.', 'success');
    } catch (err) {
      showToast('Failed to update player.', 'error');
    }
  };

  const handleDeletePlayer = async (teamId, playerId, playerName) => {
    if (!window.confirm(`Remove player "${playerName}"?`)) return;
    try {
      await api.delete(`/teams/players/${playerId}/`);
      setTeams(prevTeams => prevTeams.map(t => {
        if (t.id === teamId) {
          const updatedPlayers = (t.players || []).filter(p => p.id !== playerId);
          return { ...t, players: updatedPlayers, player_count: updatedPlayers.length };
        }
        return t;
      }));
      showToast('Player removed.', 'success');
    } catch (err) {
      showToast('Failed to delete player.', 'error');
    }
  };

  const fetchLeagueStatus = async () => {
    try {
      const res = await api.get(`/fixtures/league-status/${id}/`);
      setLeagueStatus(res.data);
      if (res.data.qualified_teams?.length) {
        setSeedOrder(res.data.qualified_teams);
      }
    } catch (err) {
      console.error('Failed to fetch league status:', err);
    }
  };

  const fetchTournamentAwards = async () => {
    try {
      const res = await api.get(`/stats/${id}/tournament-awards/`);
      const awards = res.data || [];
      setTournamentAwards(awards);
      // Pre-fill input fields from existing awards
      const inputs = {};
      awards.forEach(a => {
        inputs[a.award_type] = {
          player_name: a.player_name || '',
          team_name: a.team_name || '',
        };
      });
      setAwardInputs(inputs);
    } catch (err) {
      console.error('Failed to fetch tournament awards:', err);
    }
  };

  const handleSaveAward = async (awardType) => {
    const input = awardInputs[awardType] || {};
    if (awardType === 'best_team') {
      if (!input.team_name?.trim()) {
        showToast('Please select a team.', 'error');
        return;
      }
    } else {
      if (!input.player_name?.trim()) {
        showToast('Please enter a player name.', 'error');
        return;
      }
    }
    setSavingAward(awardType);
    try {
      await api.post('/awards/tournament/', {
        tournament_id: id,
        award_type: awardType,
        player_name: awardType === 'best_team' ? '' : input.player_name.trim(),
        team_name: (input.team_name || '').trim(),
      });
      await fetchTournamentAwards();
      showToast('Award saved!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save award.', 'error');
    } finally {
      setSavingAward(null);
    }
  };

  const handleDeleteAward = async (awardType) => {
    if (!window.confirm('Remove this award winner?')) return;
    try {
      await api.delete('/awards/tournament/', { data: { tournament_id: id, award_type: awardType } });
      await fetchTournamentAwards();
      // Clear input
      setAwardInputs(prev => ({ ...prev, [awardType]: { player_name: '', team_name: '' } }));
      showToast('Award removed.', 'success');
    } catch (err) {
      showToast('Failed to remove award.', 'error');
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  useEffect(() => {
    if (id) fetchTournamentAwards();
  }, [id]);

  useEffect(() => {
    if (tournament?.tournament_type === 'league_knockout' && (activeTab === 'matches' || activeTab === 'fixtures')) {
      fetchLeagueStatus();
    }
  }, [activeTab, tournament?.id]);

  const handleAutoGenerateKnockout = async (forceRegenerate = false) => {
    setGeneratingKnockout(true);
    try {
      const res = await api.post(
        `/fixtures/generate-knockout/${tournament.id}/`,
        { mode: 'auto', force_regenerate: forceRegenerate }
      );
      showToast(
        `✅ ${res.data.fixture_count} knockout fixture(s) created! Stage: ${res.data.stage}`,
        'success'
      );
      await Promise.all([fetchInitialData(), fetchLeagueStatus()]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate knockout fixtures.';
      showToast(msg, 'error');
    } finally {
      setGeneratingKnockout(false);
    }
  };

  const openManualSeeding = () => {
    const n = leagueStatus?.qualified_teams?.length || 0;
    const numMatches = Math.floor(n / 2);
    const initialMatches = Array.from({ length: numMatches }, () => ({ team_a: '', team_b: '' }));
    const qualified = leagueStatus?.qualified_teams || [];
    for (let i = 0; i < numMatches; i++) {
      initialMatches[i].team_a = qualified[i]?.id || '';
      initialMatches[i].team_b = qualified[n - 1 - i]?.id || '';
    }
    setManualMatches(initialMatches);
    setKnockoutSeedModal(true);
  };

  const handleUpdateManualMatch = (idx, key, val) => {
    setManualMatches(prev => prev.map((match, i) => {
      if (i === idx) {
        return { ...match, [key]: val };
      }
      return match;
    }));
  };

  const getManualSeedingError = () => {
    const selectedIds = new Set();
    let hasEmpty = false;
    let hasDuplicate = false;

    for (const match of manualMatches) {
      if (!match.team_a || !match.team_b) {
        hasEmpty = true;
      }
      if (match.team_a) {
        if (selectedIds.has(match.team_a)) hasDuplicate = true;
        selectedIds.add(match.team_a);
      }
      if (match.team_b) {
        if (selectedIds.has(match.team_b)) hasDuplicate = true;
        selectedIds.add(match.team_b);
      }
    }

    if (hasEmpty) return "Please select teams for all matches.";
    if (hasDuplicate) return "Each team can only be selected once.";
    return null;
  };

  const handleManualKnockout = async () => {
    const err = getManualSeedingError();
    if (err) {
      showToast(err, 'error');
      return;
    }

    const n = manualMatches.length * 2;
    const teamOrderIds = new Array(n);
    manualMatches.forEach((match, i) => {
      teamOrderIds[i] = match.team_a;
      teamOrderIds[n - 1 - i] = match.team_b;
    });

    setGeneratingKnockout(true);
    try {
      const res = await api.post(
        `/fixtures/generate-knockout/${tournament.id}/`,
        { mode: 'manual', team_order: teamOrderIds }
      );
      showToast(`✅ Knockout bracket created with your custom seeding!`, 'success');
      setKnockoutSeedModal(false);
      await Promise.all([fetchInitialData(), fetchLeagueStatus()]);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed.', 'error');
    } finally {
      setGeneratingKnockout(false);
    }
  };

  const renderLeagueKnockoutBanner = () => {
    if (tournament?.tournament_type !== 'league_knockout' || !leagueStatus) return null;

    return (
      <div className="mb-6">
        {/* League in progress */}
        {!leagueStatus.league_complete && leagueStatus.total_league > 0 && (
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fcd34d',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
                League Phase In Progress
              </div>
              <div style={{ fontSize: '12px', color: '#b45309' }}>
                {leagueStatus.completed_league} of {leagueStatus.total_league} league matches completed.
                Knockout fixtures will be available once all league matches are done.
              </div>
            </div>
          </div>
        )}

        {/* League complete — knockout not yet created */}
        {leagueStatus.league_complete && !leagueStatus.knockout_exists && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #15803d',
            borderRadius: '14px',
            padding: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>
                  League Phase Complete!
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginBottom: '12px' }}>
                  All {leagueStatus.total_league} league matches finished.
                  {leagueStatus.qualified_teams.length} teams have qualified for the knockout stage.
                </div>

                {/* Qualified teams list */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Qualified Teams (by standing):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {leagueStatus.qualified_teams.map((team, i) => (
                      <div key={team.id} style={{
                        backgroundColor: '#dcfce7',
                        border: '1px solid #86efac',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}>
                        <span style={{
                          backgroundColor: '#15803d',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '18px', height: '18px',
                          display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: '700',
                        }}>
                          {i + 1}
                        </span>
                        {team.name}
                        {team.points !== undefined && (
                          <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: '700' }}>
                            {team.points}pts
                          </span>
                        )}
                        {team.group && (
                          <span style={{ color: '#16a34a', fontSize: '10px', marginLeft: '4px', fontWeight: '700' }}>
                            ({team.group})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Auto generate knockout */}
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateKnockout()}
                    disabled={generatingKnockout}
                    style={{
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: generatingKnockout ? 'not-allowed' : 'pointer',
                      opacity: generatingKnockout ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {generatingKnockout ? (
                      <>⏳ Generating...</>
                    ) : (
                      <>⚡ Auto Generate Knockout Fixtures</>
                    )}
                  </button>

                  {/* Manual seeding */}
                  <button
                    type="button"
                    onClick={openManualSeeding}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#15803d',
                      border: '2px solid #15803d',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Set Bracket Manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knockout already created */}
        {leagueStatus.knockout_exists && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1.5px solid #7dd3fc',
            borderRadius: '14px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚔️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1' }}>
                  Knockout Stage Active
                </div>
                <div style={{ fontSize: '12px', color: '#0284c7' }}>
                  Knockout fixtures have been created. Enter results in the Matches tab.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Regenerate knockout fixtures? This will delete existing knockout matches and results.')) {
                  handleAutoGenerateKnockout(true);
                }
              }}
              style={{
                backgroundColor: '#fff',
                color: '#dc2626',
                border: '1.5px solid #fca5a5',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              🔄 Regenerate
            </button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const [scorersRes, assistsRes, contribRes, tableRes] = await Promise.all([
        api.get(`/stats/${id}/top-scorers/`),
        api.get(`/stats/${id}/top-assists/`),
        api.get(`/stats/${id}/goal-contributions/`),
        api.get(`/stats/${id}/league-table/`),
      ]);
      setScorers(scorersRes.data || []);
      setAssists(assistsRes.data || []);
      setContributions(contribRes.data || []);
      setTable(tableRes.data || []);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats' && id) {
      fetchStats();
    }
  }, [id, activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tRes, teamsRes, fixturesRes] = await Promise.all([
        api.get(`/tournaments/${id}/`),
        api.get(`/teams/?tournament=${id}`),
        api.get(`/fixtures/?tournament=${id}`)
      ]);
      setTournament(tRes.data);
      setTeams(teamsRes.data);
      setFixtures(fixturesRes.data);

      if (tRes.data.tournament_type === 'league_knockout') {
        fetchLeagueStatus();
        if (tRes.data.league_knockout_style === 'multi_group') {
          const groupsRes = await api.get(`/tournaments/${id}/groups/`);
          setGroups(groupsRes.data);
        }
      }

      fetchStats();
    } catch (err) {
      console.error(err);
      showToast('Error loading tournament data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── MANUAL KNOCKOUT ROUND ADVANCEMENT ────────────────────────────────────────
  // Compute whether the organiser can advance to the next knockout round.
  // Conditions:
  //   - Manual fixture mode
  //   - Tournament has knockout rounds (pure knockout or league+knockout)
  //   - All fixtures in the current/latest round are completed
  //   - A next round has NOT been created yet
  //   - The completed round has ≥ 2 fixtures (single-match = the final, no more rounds needed)
  const canAdvanceRound = (() => {
    if (!tournament) return false;
    if (tournament.fixture_generation_mode !== 'manual') return false;
    if (!['knockout', 'league_knockout'].includes(tournament.tournament_type)) return false;
    if (fixtures.length === 0) return false;

    const KO_STAGES = ['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];

    // For pure knockout, ALL fixtures are knockout fixtures
    const koFixtures = tournament.tournament_type === 'knockout'
      ? fixtures
      : fixtures.filter(f => KO_STAGES.includes(f.stage));

    if (koFixtures.length === 0) return false;

    // Group by round_number
    const byRound = {};
    for (const f of koFixtures) {
      const rn = f.round_number ?? 1;
      if (!byRound[rn]) byRound[rn] = [];
      byRound[rn].push(f);
    }
    const sortedRounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

    // Walk rounds; find the last fully-completed round
    let lastCompletedNum = null;
    let lastCompletedGroup = null;
    for (const rn of sortedRounds) {
      if (byRound[rn].every(f => f.status === 'completed')) {
        lastCompletedNum = rn;
        lastCompletedGroup = byRound[rn];
      } else {
        break; // stop at first incomplete round
      }
    }

    if (!lastCompletedGroup) return false;

    // If only 1 match in the last completed round → that was the final, no more rounds
    if (lastCompletedGroup.length < 2) return false;

    // Check next round doesn't already exist
    const nextRoundNum = lastCompletedNum + 1;
    if (byRound[nextRoundNum]) return false;

    return true;
  })();

  const handleAdvanceRound = async () => {
    setAdvancingRound(true);
    try {
      const res = await api.post(`/fixtures/advance-knockout/${id}/`);
      showToast(res.data.message, 'success');
      await fetchInitialData();
      window.dispatchEvent(new Event('bracket:refresh'));
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to advance round.';
      showToast(msg, 'error');
    } finally {
      setAdvancingRound(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (teams.length < 2) {
      showToast(`Add at least 2 teams before generating fixtures. (${teams.length} team(s) added)`, 'error');
      setActiveTab('teams');
      return;
    }

    if (fixtures.length > 0) {
      const confirmed = window.confirm(
        `This will delete all ${fixtures.length} existing fixtures and regenerate.\n\nContinue?`
      );
      if (!confirmed) return;
    }

    setGeneratingFixtures(true);
    try {
      const res = await api.post(`/tournaments/${id}/generate-fixtures/`);
      showToast(`✅ ${res.data.fixture_count} fixtures generated successfully!`, 'success');
      const fixturesRes = await api.get(`/fixtures/?tournament=${id}`);
      setFixtures(fixturesRes.data);
      fetchInitialData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate fixtures.';
      showToast(msg, 'error');
    } finally {
      setGeneratingFixtures(false);
    }
  };

  const openActivateModal = () => {
    if (teams.length < 2) {
      showToast(`Add at least 2 teams before activating. Currently ${teams.length} team(s) added.`, 'error');
      setActiveTab('teams');
      return;
    }

    if (tournament?.fixture_generation_mode === 'auto' && fixtures.length === 0) {
      showToast('Generate fixtures first before activating the tournament.', 'error');
      setActiveTab('fixtures');
      return;
    }

    setActivateModal(true);
  };

  // ── OVERVIEW ACTIONS ────────────────────────────────────────────────────────

  const handleActivate = async () => {
    try {
      const res = await api.patch(`/tournaments/${id}/activate/`);
      setTournament(prev => ({ ...prev, status: 'active', activated_at: new Date().toISOString() }));
      showToast('Tournament activated! Matches can now begin.', 'success');
      setActivateModal(false);
      fetchInitialData();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || 'Failed to activate.';
      showToast(msg, 'error');
      if (data?.can_generate) {
        setActiveTab('fixtures');
      }
    }
  };

  const handleComplete = async () => {
    try {
      const res = await api.post(`/tournaments/${id}/complete/`);
      setTournament(prev => ({ ...prev, status: 'completed', completed_at: new Date().toISOString() }));
      showToast('Tournament marked as completed!', 'success');
      setCompleteModal(false);
    } catch (err) {
      showToast('Failed to complete tournament.', 'error');
    }
  };

  const handleReopen = async () => {
    try {
      const res = await api.post(`/tournaments/${id}/reopen/`);
      setTournament(prev => ({ ...prev, status: 'active', completed_at: null }));
      showToast('Tournament reopened successfully!', 'success');
      setReopenModal(false);
    } catch (err) {
      showToast('Failed to reopen.', 'error');
    }
  };

  // ── TEAM MANAGEMENT ─────────────────────────────────────────────────────────

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.name.trim()) return;
    try {
      const res = await api.post('/teams/', {
        tournament: id,
        name: newTeam.name,
        manager_name: newTeam.manager_name || 'TBD',
        manager_phone: newTeam.manager_phone || '0000000000'
      });
      setTeams([...teams, res.data]);
      setNewTeam({ name: '', manager_name: '', manager_phone: '' });
      showToast('Team added successfully!');
    } catch (err) {
      showToast('Failed to add team.', 'error');
    }
  };

  const handleBulkAddTeams = async () => {
    const lines = bulkTeamsText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    try {
      const payload = lines.map(name => ({
        tournament: id,
        name,
        manager_name: 'TBD',
        manager_phone: '0000000000'
      }));
      const res = await api.post('/teams/manual/', payload); // Wait, manual bulk create endpoint
      // fallback in case batch creates aren't fully exposed - request lists are POST /teams/
      // Let's call them sequentially or batch if available
      // Let's do it safely
      const added = [];
      for (const item of payload) {
        const single = await api.post('/teams/', item);
        added.push(single.data);
      }
      setTeams([...teams, ...added]);
      setBulkTeamsText('');
      setShowBulkInput(false);
      showToast(`${added.length} teams added successfully!`);
    } catch (err) {
      showToast('Error adding some teams bulk.', 'error');
    }
  };

  const handleStartInlineEdit = (team) => {
    setEditingTeamId(team.id);
    setEditingTeamData({ ...team });
  };

  const handleSaveInlineEdit = async (teamId) => {
    try {
      const res = await api.put(`/teams/${teamId}/`, editingTeamData);
      setTeams(teams.map(t => t.id === teamId ? res.data : t));
      setEditingTeamId(null);
      showToast('Team updated successfully.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update team details.', 'error');
    }
  };

  const handleDeleteTeam = async (teamId, name) => {
    if (!window.confirm(`Remove "${name}" from this tournament?`)) return;
    try {
      await api.delete(`/teams/${teamId}/`);
      setTeams(teams.filter(t => t.id !== teamId));
      showToast('Team deleted.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete team.', 'error');
    }
  };

  // ── GROUPS MANAGEMENT ───────────────────────────────────────────────────────

  const handleAssignGroup = async (teamId, groupName) => {
    try {
      await api.post(`/tournaments/${id}/groups/assign/`, { team_id: teamId, group_name: groupName });
      showToast('Group assigned.');
      const groupsRes = await api.get(`/tournaments/${id}/groups/`);
      setGroups(groupsRes.data);
    } catch (err) {
      showToast('Failed to assign group.', 'error');
    }
  };

  const handleRegenerateGroups = async () => {
    try {
      await api.post(`/tournaments/${id}/groups/generate/`);
      showToast('Groups generated randomly.');
      const groupsRes = await api.get(`/tournaments/${id}/groups/`);
      setGroups(groupsRes.data);
    } catch (err) {
      showToast('Failed to generate groups.', 'error');
    }
  };

  const handleGenerateGroupFixtures = async () => {
    try {
      await api.post(`/tournaments/${id}/groups/fixtures/`);
      showToast('Group fixtures and knockout placeholders generated.');
      fetchInitialData();
    } catch (err) {
      showToast('Failed to generate group fixtures.', 'error');
    }
  };

  // ── FIXTURES MANAGEMENT ─────────────────────────────────────────────────────

  const handleSaveFixture = async (e) => {
    e.preventDefault();
    const data = fixtureModal.data;
    if (!data.team_a || !data.team_b) {
      showToast('Please select both Team A and Team B.', 'error');
      return;
    }
    if (data.team_a === data.team_b) {
      showToast('Team A and Team B must be different teams.', 'error');
      return;
    }

    // Auto calculate group stage code if teams belong to a group
    let autoStage = 'league';
    if (groups && groups.length > 0) {
      const teamAGroup = groups.find(g =>
        (g.teams || []).some(t => (typeof t === 'object' ? t.id === data.team_a : t === data.team_a))
      );
      if (teamAGroup) {
        const groupCode = `group_${teamAGroup.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        autoStage = ['group_a', 'group_b', 'group_c', 'group_d', 'group_e', 'group_f', 'group_g', 'group_h'].includes(groupCode)
          ? groupCode
          : 'group';
      }
    }

    // Client-side duplicate check based on tournament format (single vs home & away)
    const isHomeAndAway = tournament.home_and_away;
    const teamAObj = teams.find(t => t.id === data.team_a);
    const teamBObj = teams.find(t => t.id === data.team_b);
    const nameA = teamAObj?.name || 'Team A';
    const nameB = teamBObj?.name || 'Team B';

    const existingPairMatches = fixtures.filter(f => {
      if (fixtureModal.mode === 'edit' && f.id === data.id) return false;
      return (f.team_a === data.team_a && f.team_b === data.team_b) ||
             (f.team_a === data.team_b && f.team_b === data.team_a);
    });

    if (!isHomeAndAway) {
      if (existingPairMatches.length >= 1) {
        showToast(`A match between ${nameA} and ${nameB} already exists. Single-match mode allows only 1 match per pair.`, 'error');
        return;
      }
    } else {
      if (existingPairMatches.length >= 2) {
        showToast(`Maximum 2 matches (Home & Away) allowed between ${nameA} and ${nameB}.`, 'error');
        return;
      }
      const exactHomeMatch = existingPairMatches.find(f => f.team_a === data.team_a && f.team_b === data.team_b);
      if (exactHomeMatch) {
        showToast(`Home match ${nameA} vs ${nameB} already exists. You can create the away match (${nameB} vs ${nameA}).`, 'error');
        return;
      }
    }

    const isKnockoutContext = 
      tournament.tournament_type === 'knockout' || 
      data.stage !== 'league';

    let roundNumber = null;
    if (isKnockoutContext) {
      const isKO = (f) => tournament.tournament_type === 'knockout' || f.stage !== 'league';
      const koFixtures = fixtures.filter(isKO);
      const wins = koFixtures.filter(f => f.status === 'completed' && f.winner === data.team_a).length;
      roundNumber = wins + 1;
    }

    const payload = {
      tournament: id,
      team_a: data.team_a,
      team_b: data.team_b,
      match_date: data.match_date || null,
      match_time: data.match_time || null,
      stage: data.stage || autoStage,
      venue: data.venue || '',
      ...(roundNumber ? { round_number: roundNumber } : {}),
    };

    try {
      if (fixtureModal.mode === 'add') {
        const res = await api.post('/fixtures/', payload);
        setFixtures(prev => [...prev, res.data]);
        showToast('Fixture created successfully.', 'success');
      } else {
        const res = await api.put(`/fixtures/${data.id}/`, payload);
        setFixtures(prev => prev.map(f => f.id === data.id ? res.data : f));
        showToast('Fixture updated successfully.', 'success');
      }
      setFixtureModal(null);
      fetchInitialData();
    } catch (err) {
      console.error('Fixture save error:', err.response?.data || err);
      let errMsg = 'Failed to save fixture.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.error) {
          errMsg = err.response.data.error;
        } else if (typeof err.response.data === 'object') {
          const fieldErrs = Object.entries(err.response.data)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join(' | ');
          if (fieldErrs) errMsg = fieldErrs;
        }
      }
      showToast(errMsg, 'error');
    }
  };

  const handleDeleteFixture = async (fixtureId) => {
    if (!window.confirm('Delete this fixture?')) return;
    try {
      await api.delete(`/fixtures/${fixtureId}/`);
      setFixtures(fixtures.filter(f => f.id !== fixtureId));
      showToast('Fixture deleted.');
    } catch (err) {
      showToast('Failed to delete fixture.', 'error');
    }
  };

  const handleAutoGenerateFixtures = async () => {
    try {
      await api.post('/fixtures/auto-generate/', {
        tournament: id,
        type: tournament.tournament_type,
        qualifiers: tournament.knockout_qualifiers
      });
      showToast('All fixtures auto-generated successfully!');
      setRegenerateFixturesModal(false);
      fetchInitialData();
    } catch (err) {
      showToast('Failed to auto-generate fixtures.', 'error');
    }
  };

  const handleSaveResult = async (fixtureId, responseData) => {
    // Update locally — include winner so the loser strikethrough renders immediately
    setFixtures(prev => prev.map(f => f.id === fixtureId ? {
      ...f,
      score_a: responseData.score_a,
      score_b: responseData.score_b,
      penalty_score_a: responseData.penalty_score_a ?? null,
      penalty_score_b: responseData.penalty_score_b ?? null,
      winner: responseData.winner_id ?? null,
      status: responseData.status
    } : f));
    showToast('Match result saved.');
    fetchInitialData(); // reload table stats

    // Refresh bracket view if it's currently showing knockout data
    window.dispatchEvent(new Event('bracket:refresh'));

    // Also refresh league status in case this was the last league match
    await fetchLeagueStatus();
  };

  // Helper checks
  const isDraft = tournament?.status === 'draft';
  const isActive = tournament?.status === 'active';
  const isCompleted = tournament?.status === 'completed';
  const isMultiGroup = tournament?.tournament_type === 'league_knockout' && tournament?.league_knockout_style === 'multi_group';

  const showKnockoutTab =
    tournament?.tournament_type === 'knockout' ||
    (tournament?.tournament_type === 'league_knockout' && leagueStatus?.knockout_exists);

  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: '📋' },
    { key: 'teams',     label: 'Teams',     icon: '👥' },
    ...(isMultiGroup ? [{ key: 'groups', label: 'Groups', icon: '🗂️' }] : []),
    { key: 'fixtures',  label: 'Fixtures',  icon: '📅' },
    ...(showKnockoutTab ? [{ key: 'knockout', label: 'Knockout', icon: '⚔️' }] : []),
    { key: 'matches',   label: 'Matches',   icon: '⚽' },
    { key: 'stats',     label: 'Stats',     icon: '📊' },
    { key: 'awards',    label: 'Awards',    icon: '🏆' },
  ];

  if (loading || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] text-[var(--txt2)]">
        <div className="animate-spin text-4xl mb-4 text-emerald-600">⚽</div>
        <p className="font-semibold text-sm">Loading tournament management...</p>
      </div>
    );
  }

  // Calculate metrics
  const totalFixtures = fixtures.length;
  const completedFixtures = fixtures.filter(f => f.status === 'completed').length;
  const progressPct = totalFixtures > 0 ? (completedFixtures / totalFixtures) * 100 : 0;

  // Calculate knockout variables for manual fixture modal if it is open
  const isKnockoutContext = fixtureModal && (
    tournament.tournament_type === 'knockout' || 
    fixtureModal.data.stage !== 'league'
  );

  const isManualKnockout = tournament.fixture_generation_mode === 'manual' && tournament.tournament_type === 'knockout';

  const isKO = (f) => tournament.tournament_type === 'knockout' || f.stage !== 'league';
  const koFixtures = fixtures.filter(isKO);
  const editingFixtureId = fixtureModal?.data?.id;

  const eligibleTeams = teams.filter(t => {
    if (!isKnockoutContext) return true;
    // In manual mode, organiser picks stage freely — don't filter by wins/losses
    if (isManualKnockout) return true;

    // Auto-mode: Check if team has lost any completed KO match
    const hasLost = koFixtures.some(f => 
      f.status === 'completed' && 
      (f.team_a === t.id || f.team_b === t.id) && 
      f.winner !== t.id
    );
    if (hasLost) return false;

    // Auto-mode: Check if team is busy in an incomplete KO match (excluding current fixture if editing)
    const isBusy = koFixtures.some(f => 
      f.id !== editingFixtureId && 
      f.status !== 'completed' && 
      (f.team_a === t.id || f.team_b === t.id)
    );
    if (isBusy) return false;

    return true;
  });

  const getWins = (teamId) => koFixtures.filter(f => f.status === 'completed' && f.winner === teamId).length;

  const KNOCKOUT_STAGE_OPTIONS = [
    { value: 'round_of_64', label: 'Round of 64' },
    { value: 'round_of_32', label: 'Round of 32' },
    { value: 'round_of_16', label: 'Round of 16' },
    { value: 'quarter',     label: 'Quarter Final' },
    { value: 'semi',        label: 'Semi Final' },
    { value: 'final',       label: 'Final' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen relative text-[var(--txt)]">
      
      {/* Toast Notification */}
      {toast && (
        <div 
          className="fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg font-semibold text-sm z-50 animate-fade-in flex items-center gap-2 text-white"
          style={{ backgroundColor: toast.type === 'success' ? '#15803d' : '#dc2626' }}
        >
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 border border-[var(--border)] rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black">{tournament.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-[var(--txt2)] uppercase tracking-wider">
              📍 {tournament.area_name}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            
            {/* Status Badge */}
            <StatusBadge status={tournament.status} />
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[var(--border)] gap-2 overflow-x-auto pb-px mb-6 scrollbar-none">
        {tabs.map(tab => {
          const isAct = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${isAct 
                  ? 'border-green-700 text-green-700 dark:text-green-400 dark:border-green-400 font-black' 
                  : 'border-transparent text-[var(--txt2)] hover:text-[var(--txt)]'}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 1 — OVERVIEW
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Meta summary card */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4 md:col-span-2">
              <h3 className="font-extrabold text-base border-b border-[var(--border)] pb-2">Tournament Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
                <div>
                  <span className="text-xs font-bold text-[var(--txt2)] block">Age category</span>
                  <span className="text-[var(--txt)] mt-0.5 block">{ageLabels[tournament.age_category] || tournament.age_category}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--txt2)] block">Ground type</span>
                  <span className="text-[var(--txt)] mt-0.5 block">{tournament.ground_type} chip size</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--txt2)] block">Tournament type</span>
                  <span className="text-[var(--txt)] mt-0.5 block">{typeLabels[tournament.tournament_type]}</span>
                </div>
                {tournament.activated_at && (
                  <div>
                    <span className="text-xs font-bold text-[var(--txt2)] block">Activated date</span>
                    <span className="text-[var(--txt)] mt-0.5 block">{new Date(tournament.activated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics column */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-extrabold text-base border-b border-[var(--border)] pb-2">Match Progression</h3>
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-[var(--txt2)]">Total Teams</span>
                  <span className="text-[var(--txt)]">{teams.length} / {tournament.max_teams}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-[var(--txt2)]">Completed Matches</span>
                  <span className="text-[var(--txt)]">{completedFixtures} / {totalFixtures}</span>
                </div>
                
                {/* Progress bar */}
                <div style={{ marginTop: '4px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#15803d' }}>Progress</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#15803d' }}>{Math.round(progressPct)}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '999px',
                    height: '10px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      backgroundColor: '#15803d',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-6">
                {isDraft && (
                  <button
                    type="button"
                    onClick={openActivateModal}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#166534';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#15803d';
                    }}
                  >
                    <Play size={16} fill="white" /> Activate Tournament
                  </button>
                )}
                {isActive && (
                  <button
                    type="button"
                    onClick={() => setCompleteModal(true)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#166534';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#15803d';
                    }}
                  >
                    <CheckCircle size={16} /> Mark as Completed
                  </button>
                )}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => setReopenModal(true)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      fontWeight: '800',
                      fontSize: '14px',
                      border: '2px solid #374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <RotateCcw size={16} /> Reopen Tournament
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ── Tournament Award Winners (Overview) ── */}
          {tournamentAwards.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-base border-b border-[var(--border)] pb-2 mb-4">🏆 Award Winners</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {tournamentAwards.map(a => {
                  const awardLabel = (a.award_type || '').toUpperCase().replace(/_/g, ' ');
                  return (
                    <div key={a.id} style={{
                      background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                      border: '1.5px solid #fde047',
                      borderRadius: '14px',
                      padding: '14px 16px',
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#92400e', letterSpacing: '0.05em', marginBottom: '4px' }}>{awardLabel}</div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827' }}>{a.player_display_name || a.player_name}</div>
                      {a.team_name && <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', marginTop: '2px' }}>{a.team_name}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 2 — TEAMS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          
          {/* Lock Banner when completed */}
          {isCompleted && (
            <div className="p-4 bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-800 rounded-2xl flex items-start gap-3">
              <Info size={20} className="text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Team list is locked</p>
                <p className="text-xs text-[var(--txt2)] mt-0.5">The tournament has already been completed. Team roster details are locked.</p>
              </div>
            </div>
          )}

          {/* Teams Table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[var(--border)] bg-zinc-50 dark:bg-zinc-900/60 font-bold text-sm">
              Registered Teams ({teams.length})
            </div>
            
            {teams.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--txt2)] font-semibold italic">No teams registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--txt2)] bg-zinc-50/50 dark:bg-zinc-900/30">
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4">Team Name</th>
                      <th className="p-4">Manager Name</th>
                      <th className="p-4">Manager Phone</th>
                      <th className="p-4 w-28 text-center">Players</th>
                      {!isCompleted && <th className="p-4 w-24 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm font-semibold text-[var(--txt)]">
                    {teams.map((team, idx) => {
                      const isEditing = editingTeamId === team.id;
                      return (
                        <React.Fragment key={team.id}>
                          <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                            <td className="p-4 text-center text-xs font-bold text-[var(--txt2)]">{idx + 1}</td>
                            
                            {/* Team Name */}
                            <td className="p-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-bold w-full"
                                  value={editingTeamData.name}
                                  onChange={e => setEditingTeamData({ ...editingTeamData, name: e.target.value })}
                                />
                              ) : (
                                <span className="font-bold">{team.name}</span>
                              )}
                            </td>

                            {/* Manager Name */}
                            <td className="p-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold w-full"
                                  value={editingTeamData.manager_name}
                                  onChange={e => setEditingTeamData({ ...editingTeamData, manager_name: e.target.value })}
                                />
                              ) : (
                                <span className="text-[var(--txt2)]">{team.manager_name || 'TBD'}</span>
                              )}
                            </td>

                            {/* Manager Phone */}
                            <td className="p-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold w-full"
                                  value={editingTeamData.manager_phone}
                                  onChange={e => setEditingTeamData({ ...editingTeamData, manager_phone: e.target.value })}
                                />
                              ) : (
                                <span className="text-[var(--txt2)]">{team.manager_phone || 'TBD'}</span>
                              )}
                            </td>

                            {/* Players count & roster toggle */}
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: expandedTeamId === team.id ? '#f0fdf4' : '#f3f4f6',
                                  color: expandedTeamId === team.id ? '#15803d' : '#374151',
                                  border: expandedTeamId === team.id ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>🏃 {(team.players || []).length} Players</span>
                                <span style={{ fontSize: '10px' }}>{expandedTeamId === team.id ? '▲' : '▼'}</span>
                              </button>
                            </td>

                            {/* Actions */}
                            {!isCompleted && (
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveInlineEdit(team.id)}
                                        className="px-2.5 py-1 rounded bg-green-700 text-white text-xs font-bold"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingTeamId(null)}
                                        className="px-2.5 py-1 rounded bg-zinc-200 text-zinc-700 text-xs font-bold"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleStartInlineEdit(team)}
                                        className="p-1 hover:text-green-700 transition-colors"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTeam(team.id, team.name)}
                                        className="p-1 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>

                          {/* Expanded Player Roster Panel */}
                          {expandedTeamId === team.id && (
                            <tr key={`${team.id}-players`} className="bg-green-50/40 dark:bg-zinc-900/40 border-b border-[var(--border)]">
                              <td colSpan={!isCompleted ? 6 : 5} className="p-4">
                                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>
                                      🏃 {team.name} — Player Roster ({(team.players || []).length})
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                      Players will appear in dropdowns during result entry!
                                    </div>
                                  </div>

                                  {/* Add Player(s) Input Form */}
                                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <input
                                      type="text"
                                      placeholder="Enter player name or comma-separated names (e.g. Ronaldo, Messi, Neymar)"
                                      style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                      }}
                                      value={newPlayerInput}
                                      onChange={e => setNewPlayerInput(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddPlayersToTeam(team.id);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddPlayersToTeam(team.id)}
                                      style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        backgroundColor: '#15803d',
                                        color: '#ffffff',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      + Add Players
                                    </button>
                                  </div>

                                  {/* Players Roster Grid */}
                                  {(!team.players || team.players.length === 0) ? (
                                    <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', padding: '8px 0' }}>
                                      No players added yet. Add player names above for quick match result entry dropdowns!
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                                      {team.players.map((player, pIdx) => {
                                        const isEditingPlayer = editingPlayerId === player.id;
                                        return (
                                          <div
                                            key={player.id}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              padding: '6px 10px',
                                              backgroundColor: '#f9fafb',
                                              borderRadius: '8px',
                                              border: '1px solid #e5e7eb',
                                              fontSize: '12px',
                                              fontWeight: '700',
                                            }}
                                          >
                                            {isEditingPlayer ? (
                                              <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                                                <input
                                                  type="text"
                                                  style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px' }}
                                                  value={editingPlayerName}
                                                  onChange={e => setEditingPlayerName(e.target.value)}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEditPlayer(team.id, player.id);
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveEditPlayer(team.id, player.id)}
                                                  style={{ padding: '2px 6px', backgroundColor: '#15803d', color: '#fff', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: '800' }}
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingPlayerId(null)}
                                                  style={{ padding: '2px 6px', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '4px', border: 'none', fontSize: '11px' }}
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <span style={{ color: '#111827' }}>
                                                  <span style={{ color: '#6b7280', fontSize: '11px', marginRight: '6px' }}>{pIdx + 1}.</span>
                                                  {player.name}
                                                </span>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditingPlayerId(player.id);
                                                      setEditingPlayerName(player.name);
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px' }}
                                                    title="Edit player"
                                                  >
                                                    ✏️
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeletePlayer(team.id, player.id, player.name)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px' }}
                                                    title="Delete player"
                                                  >
                                                    🗑️
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Team Forms */}
          {!isCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Single Add form */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm border-b border-[var(--border)] pb-2 flex items-center gap-1">
                  <Plus size={16} /> Add Single Team
                </h3>
                <form onSubmit={handleAddTeam} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--txt2)] mb-1">Team Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Red Eagles"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-semibold"
                      value={newTeam.name}
                      onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">Manager Name</label>
                      <input
                        type="text"
                        placeholder="Manager Name"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                        value={newTeam.manager_name}
                        onChange={e => setNewTeam({ ...newTeam, manager_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">Phone</label>
                      <input
                        type="text"
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                        value={newTeam.manager_phone}
                        onChange={e => setNewTeam({ ...newTeam, manager_phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs shadow"
                  >
                    Save Team
                  </button>
                </form>
              </div>

              {/* Bulk paste form */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm border-b border-[var(--border)] pb-2 flex items-center gap-1 mb-3">
                    📋 Add Multiple Teams
                  </h3>
                  <p className="text-xs text-[var(--txt2)] font-semibold mb-3">Paste one team name per line below to register teams in bulk.</p>
                  <textarea
                    rows="4"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold placeholder-zinc-400"
                    placeholder="Red Eagles&#10;Blue Stars&#10;Gold Rovers"
                    value={bulkTeamsText}
                    onChange={e => setBulkTeamsText(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBulkAddTeams}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white font-extrabold text-xs shadow mt-4 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  Bulk Add Teams
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 3 — GROUPS (Multi-group only)
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'groups' && isMultiGroup && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Actions panel */}
          {!isCompleted && (
            <div className="flex justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-800/30 border border-[var(--border)] p-4 rounded-2xl">
              <span className="text-xs font-bold text-[var(--txt2)]">Assign teams into groups, then click Generate Group Fixtures below to build schedule.</span>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerateGroups}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1 bg-[var(--bg)] cursor-pointer"
                >
                  <Shuffle size={14} /> Regenerate Groups
                </button>
                <button
                  onClick={handleGenerateGroupFixtures}
                  className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-bold cursor-pointer"
                >
                  Generate Group Fixtures
                </button>
              </div>
            </div>
          )}

          {/* Groups Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {groups.map(group => {
              const nameKey = (group.name || '').replace(/Group\s+/i, '').trim().toUpperCase();
              const groupColors = {
                A: {
                  bg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
                  border: 'border-l-4 border-emerald-500',
                  text: 'text-emerald-800 dark:text-emerald-400',
                },
                B: {
                  bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
                  border: 'border-l-4 border-blue-500',
                  text: 'text-blue-800 dark:text-blue-400',
                },
                C: {
                  bg: 'bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20',
                  border: 'border-l-4 border-purple-500',
                  text: 'text-purple-800 dark:text-purple-400',
                },
                D: {
                  bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
                  border: 'border-l-4 border-amber-500',
                  text: 'text-amber-800 dark:text-amber-400',
                },
              };
              const style = groupColors[nameKey] || {
                bg: 'bg-gradient-to-r from-zinc-50 to-neutral-50 dark:from-zinc-950/10 dark:to-neutral-950/10',
                border: 'border-l-4 border-zinc-500',
                text: 'text-zinc-800 dark:text-zinc-400',
              };

              return (
                <div key={group.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                  <div>
                    <div className={`px-4 py-2.5 border-b border-[var(--border)] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${style.bg} ${style.border} ${style.text}`}>
                      Group {group.name}
                    </div>
                    <div className="p-3 space-y-1.5">
                      {group.teams.length === 0 ? (
                        <p className="text-xs text-[var(--txt2)] font-semibold italic py-4 text-center">No teams assigned yet.</p>
                      ) : (
                        group.teams.map((team, tIdx) => (
                          <div key={team.id} className="flex items-center justify-between text-xs font-bold bg-zinc-50/50 dark:bg-zinc-800/10 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 px-2.5 py-1.5 rounded-xl border border-[var(--border)] transition-colors">
                            <span className="truncate pr-2">{tIdx + 1}. {team.name}</span>
                            
                            {/* Move Group selector */}
                            {!isCompleted && (
                              <select
                                className="px-1.5 py-0.5 border border-[var(--border)] bg-[var(--card)] rounded text-[10px] font-extrabold outline-none focus:border-green-600 cursor-pointer shrink-0"
                                value={group.name}
                                onChange={e => handleAssignGroup(team.id, e.target.value)}
                              >
                                {groups.map(g => (
                                  <option key={g.name} value={g.name}>{g.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 4 — FIXTURES (Manually add/edit/delete fixtures)
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          {renderLeagueKnockoutBanner()}
          
          {/* Actions bar */}
          {!isCompleted && (
            <div className="flex justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-800/30 border border-[var(--border)] p-4 rounded-2xl">
              <span className="text-xs font-bold text-[var(--txt2)]">
                {tournament.fixture_generation_mode === 'auto'
                  ? 'Fixtures can be auto-generated automatically or managed manually.'
                  : 'Manually manage scheduled matches.'}
              </span>
              <div className="flex gap-2">
                {tournament.fixture_generation_mode === 'auto' && (
                  <button
                    type="button"
                    onClick={handleGenerateFixtures}
                    disabled={generatingFixtures}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '13px',
                      border: 'none',
                      cursor: generatingFixtures ? 'not-allowed' : 'pointer',
                      opacity: generatingFixtures ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {generatingFixtures ? (
                      <>
                        <div style={{ width: '12px', height: '12px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>⚡ {fixtures.length > 0 ? 'Regenerate Fixtures' : 'Auto Generate Fixtures'}</>
                    )}
                  </button>
                )}
                {/* Advance to Next Round button — manual knockout only */}
                {canAdvanceRound && (
                  <button
                    type="button"
                    onClick={handleAdvanceRound}
                    disabled={advancingRound}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: advancingRound ? 'not-allowed' : 'pointer',
                      opacity: advancingRound ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.30)',
                      animation: 'pulse-glow 2s ease-in-out infinite',
                    }}
                  >
                    {advancingRound ? (
                      <>
                        <div style={{ width: '12px', height: '12px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Advancing...</span>
                      </>
                    ) : (
                      <>⚡ Advance to Next Round →</>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFixtureModal({ mode: 'add', data: { team_a: '', team_b: '', match_date: '', match_time: '', venue: '', stage: tournament.tournament_type === 'knockout' ? getStartingKnockoutStage(teams.length) : 'league' } })}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    backgroundColor: tournament.fixture_generation_mode === 'auto' ? '#ffffff' : '#15803d',
                    color: tournament.fixture_generation_mode === 'auto' ? '#111827' : '#ffffff',
                    border: tournament.fixture_generation_mode === 'auto' ? '1.5px solid #d1d5db' : 'none',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} /> Add Fixture
                </button>
              </div>
            </div>
          )}

          {/* Fixtures list / Empty state */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[var(--border)] bg-zinc-50 dark:bg-zinc-900/60 font-bold text-sm flex justify-between items-center">
              <span>Match Schedule &amp; Seedings ({fixtures.length})</span>
              {tournament.fixture_generation_mode === 'auto' && (
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                  ⚡ Auto Mode
                </span>
              )}
            </div>
            
            {fixtures.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: '#f9fafb',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                  {tournament.fixture_generation_mode === 'auto' ? '📋' : '✏️'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {tournament.fixture_generation_mode === 'auto'
                    ? 'No fixtures generated yet'
                    : 'Manual fixture entry'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                  {tournament.fixture_generation_mode === 'auto'
                    ? (teams.length < 2
                        ? `Add at least 2 teams before generating fixtures. (${teams.length} team${teams.length !== 1 ? 's' : ''} added)`
                        : `${teams.length} teams are ready. Click below to auto-generate all fixtures.`)
                    : 'Add your fixtures one by one using the "+ Add Fixture" button.'
                  }
                </div>
                {tournament.fixture_generation_mode === 'auto' && teams.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleGenerateFixtures}
                    disabled={generatingFixtures}
                    style={{
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 28px',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: generatingFixtures ? 'not-allowed' : 'pointer',
                      opacity: generatingFixtures ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
                    }}
                  >
                    {generatingFixtures ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Generating Fixtures...</span>
                      </>
                    ) : (
                      <>⚡ Auto Generate Fixtures</>
                    )}
                  </button>
                )}
                {tournament.fixture_generation_mode === 'manual' && (
                  <button
                    type="button"
                    onClick={() => setFixtureModal({ mode: 'add', data: { team_a: '', team_b: '', match_date: '', match_time: '', venue: '', stage: tournament.tournament_type === 'knockout' ? getStartingKnockoutStage(teams.length) : 'league' } })}
                    style={{
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Add First Fixture
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--txt2)] bg-zinc-50/50 dark:bg-zinc-900/30">
                      <th className="p-4 w-28 text-center">Stage/Round</th>
                      <th className="p-4">Matchup</th>
                      <th className="p-4 w-40">Date &amp; Time</th>
                      <th className="p-4 w-40">Venue</th>
                      <th className="p-4 w-24 text-center">Status</th>
                      {!isCompleted && <th className="p-4 w-24 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm font-semibold text-[var(--txt)]">
                    {fixtures.map(f => {
                      const isComp = f.status === 'completed';
                      const knockoutStages = ['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'];
                      const isKnockout = tournament.tournament_type === 'knockout' || knockoutStages.includes(f.stage);
                      const scoreA = Number(f.score_a);
                      const scoreB = Number(f.score_b);
                      const winnerUUID = f.winner
                        ? String(f.winner)
                        : scoreA > scoreB ? String(f.team_a)
                        : scoreB > scoreA ? String(f.team_b)
                        : null;
                      const isTeamALoser = isComp && isKnockout && winnerUUID && String(f.team_a) !== winnerUUID;
                      const isTeamBLoser = isComp && isKnockout && winnerUUID && String(f.team_b) !== winnerUUID;

                      return (
                        <tr key={f.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                          
                          {/* Round / Stage */}
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs font-bold">
                              {f.stage === 'league' ? `Round ${f.round_number || 1}` : f.stage.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>

                          {/* Matchup */}
                          <td className="p-4 font-bold text-sm">
                            <span className={isTeamALoser ? 'line-through text-zinc-550 dark:text-zinc-400 font-semibold opacity-90' : ''}>
                              {f.team_a_name || 'TBD'}
                            </span>
                            <span className="text-zinc-400 font-medium px-1.5">vs</span>
                            <span className={isTeamBLoser ? 'line-through text-zinc-550 dark:text-zinc-400 font-semibold opacity-90' : ''}>
                              {f.team_b_name || 'TBD'}
                            </span>
                          </td>

                          {/* Date & Time */}
                          <td className="p-4 text-xs font-semibold text-[var(--txt2)]">
                            {f.match_date ? new Date(f.match_date).toLocaleDateString() : 'TBD'} {f.match_time ? `at ${f.match_time.slice(0, 5)}` : ''}
                          </td>

                          {/* Venue */}
                          <td className="p-4 text-xs font-semibold text-[var(--txt2)]">
                            {f.venue || 'TBD'}
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase tracking-wider
                              ${f.status === 'completed' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
                            >
                              {f.status}
                            </span>
                          </td>

                          {/* Actions */}
                          {!isCompleted && (
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setFixtureModal({ mode: 'edit', data: { ...f } })}
                                  className="p-1 hover:text-green-700 transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFixture(f.id)}
                                  className="p-1 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'knockout' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>
              Knockout Bracket
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Click any match with two teams assigned to enter its result.
              Winners automatically advance to the next round.
            </p>
          </div>

          <BracketView
            tournamentId={tournament.id}
            editable={tournament.status === 'active'}
            onEditMatch={(match) => {
              // Reuse the existing match result modal from the Matches tab
              const fullFixture = fixtures.find(f => f.id === match.id) || {
                id: match.id,
                team_a_id: match.team_a?.id,
                team_a_name: match.team_a?.name,
                team_b_id: match.team_b?.id,
                team_b_name: match.team_b?.name,
                score_a: match.score_a,
                score_b: match.score_b,
                stage: 'knockout',
              };
              setResultModal(fullFixture);
            }}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 5 — MATCHES (Results & scores entry)
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          {renderLeagueKnockoutBanner()}
          
          {totalFixtures === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--txt2)] font-semibold italic bg-[var(--card)] rounded-2xl border border-[var(--border)]">
              No matches scheduled. Please create or generate fixtures first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fixtures.map(f => {
                const isComp = f.status === 'completed';
                // A match is "knockout" if the tournament is knockout-only, OR the stage is one of the known knockout stages
                const knockoutStages = ['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'];
                const isKnockout = tournament.tournament_type === 'knockout' || knockoutStages.includes(f.stage);

                // Resolve winner UUID: prefer explicit winner field, fall back to score comparison
                const scoreA = Number(f.score_a);
                const scoreB = Number(f.score_b);
                const winnerUUID = f.winner
                  ? String(f.winner)
                  : scoreA > scoreB
                  ? String(f.team_a)
                  : scoreB > scoreA
                  ? String(f.team_b)
                  : null;

                const isTeamALoser = isComp && isKnockout && winnerUUID && String(f.team_a) !== winnerUUID;
                const isTeamBLoser = isComp && isKnockout && winnerUUID && String(f.team_b) !== winnerUUID;

                return (
                  <div key={f.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Top labels */}
                      <div className="flex justify-between items-center text-xs font-bold text-[var(--txt2)] border-b border-[var(--border)] pb-2 mb-3">
                        <span>{f.stage === 'league' ? `League · Round ${f.round_number}` : f.stage.replace(/_/g, ' ').toUpperCase()}</span>
                        <span>{f.match_date ? `${new Date(f.match_date).toLocaleDateString()} ${f.match_time ? f.match_time.slice(0, 5) : ''}` : 'TBD'}</span>
                      </div>
                      
                      {/* Match Score Display */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex-1 flex flex-col items-start gap-1">
                          <span className={`font-extrabold text-sm truncate w-full ${isTeamALoser ? 'line-through text-zinc-550 dark:text-zinc-400 font-semibold opacity-90' : 'text-[var(--txt)]'}`}>
                            {f.team_a_name || 'TBD'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 px-4 font-black text-lg">
                          {isComp ? (
                            <>
                              <span className="bg-zinc-100 dark:bg-zinc-800 w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border)] text-[var(--txt)]">{f.score_a}</span>
                              <span className="text-zinc-400">&ndash;</span>
                              <span className="bg-zinc-100 dark:bg-zinc-800 w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border)] text-[var(--txt)]">{f.score_b}</span>
                            </>
                          ) : (
                            <span className="text-zinc-350 dark:text-zinc-700 italic text-xs font-bold font-sans">VS</span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col items-end gap-1">
                          <span className={`font-extrabold text-sm truncate w-full text-right ${isTeamBLoser ? 'line-through text-zinc-550 dark:text-zinc-400 font-semibold opacity-90' : 'text-[var(--txt)]'}`}>
                            {f.team_b_name || 'TBD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-4">
                      <StatusBadge status={f.status} />
                      
                      <div className="flex items-center gap-2">
                        {/* Result enter triggers (Requires active tournament) */}
                        {!isDraft ? (
                          <button
                            onClick={() => setResultModal(f)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                       bg-orange-50 hover:bg-orange-100
                                       text-orange-600 hover:text-orange-700
                                       border border-orange-200 hover:border-orange-300
                                       text-sm font-medium transition-all duration-150
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Enter / Edit result"
                          >
                            ✏️ <span className="hidden sm:inline">
                              {f.status === 'completed' ? 'Edit Result' : 'Enter Result'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-[var(--txt2)] italic">Activate to enter results</span>
                        )}

                        {/* Edit Details & Delete Match (when not completed) */}
                        {!isCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => setFixtureModal({ mode: 'edit', data: { ...f } })}
                              className="flex items-center justify-center p-1.5 rounded-lg
                                         bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700
                                         text-zinc-600 hover:text-zinc-800 dark:text-zinc-350 dark:hover:text-white
                                         border border-[var(--border)] transition-all"
                              title="Edit Match Details"
                            >
                              ⚙️
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this match?')) {
                                  handleDeleteFixture(f.id);
                                }
                              }}
                              className="flex items-center justify-center p-1.5 rounded-lg
                                         bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30
                                         text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                                         border border-red-200 hover:border-red-350 dark:border-red-900/50 transition-all"
                              title="Delete Match"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 6 — STATS & STANDINGS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <div className="space-y-6 py-6">
          {statsLoading ? (
            <div className="text-center py-12 text-gray-400">Loading stats...</div>
          ) : (
            <>
              <StandingsSection table={table} groups={groups} tournament={tournament} />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <TopScorersTable scorers={scorers} />
                <TopAssistsTable assists={assists} />
                <GoalContributionsTable contributions={contributions} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 7 — AWARDS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h3 className="font-extrabold text-base border-b border-[var(--border)] pb-2 mb-5">🏆 Tournament Awards</h3>

            {/* Tournament-level awards (non-MOTM) */}
            <div className="space-y-4">
              {Object.keys(tournament.awards_config)
                .filter(key => key !== 'man_of_match' && tournament.awards_config[key]?.enabled)
                .map(key => {
                  const label = key.toUpperCase().replace(/_/g, ' ');
                  const existing = tournamentAwards.find(a => a.award_type === key);
                  const input = awardInputs[key] || { player_name: '', team_name: '' };
                  const isSaving = savingAward === key;

                  return (
                    <div key={key} style={{
                      background: existing ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'var(--card)',
                      border: existing ? '2px solid #86efac' : '1.5px solid var(--border)',
                      borderRadius: '16px',
                      padding: '18px 20px',
                    }}>
                      {/* Award header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '22px' }}>🏆</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--txt)' }}>{label}</div>
                            {existing ? (
                              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700' }}>
                                ✅ {key === 'best_team' ? existing.team_name : (existing.player_display_name || existing.player_name)}
                                {key !== 'best_team' && existing.team_name ? ` · ${existing.team_name}` : ''}
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: 'var(--txt2)', fontWeight: '600' }}>No winner assigned yet</div>
                            )}
                          </div>
                        </div>
                        {existing && (
                          <button
                            onClick={() => handleDeleteAward(key)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: '1.5px solid #fca5a5',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                            }}
                          >
                            ✕ Clear
                          </button>
                        )}
                      </div>

                      {/* Input form */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {key === 'best_team' ? (
                          <select
                            value={input.team_name}
                            onChange={e => setAwardInputs(prev => ({ ...prev, [key]: { ...prev[key], team_name: e.target.value } }))}
                            style={{
                              flex: '2',
                              minWidth: '150px',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border)',
                              backgroundColor: 'var(--bg)',
                              color: 'var(--txt)',
                              fontSize: '13px',
                              fontWeight: '600',
                              outline: 'none',
                            }}
                          >
                            <option value="">Select Team *</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <input
                              type="text"
                              placeholder="Player name *"
                              value={input.player_name}
                              onChange={e => setAwardInputs(prev => ({ ...prev, [key]: { ...prev[key], player_name: e.target.value } }))}
                              style={{
                                flex: '2',
                                minWidth: '150px',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1.5px solid var(--border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--txt)',
                                fontSize: '13px',
                                fontWeight: '600',
                                outline: 'none',
                              }}
                            />
                            <select
                              value={input.team_name}
                              onChange={e => setAwardInputs(prev => ({ ...prev, [key]: { ...prev[key], team_name: e.target.value } }))}
                              style={{
                                flex: '2',
                                minWidth: '130px',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1.5px solid var(--border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--txt)',
                                fontSize: '13px',
                                fontWeight: '600',
                                outline: 'none',
                              }}
                            >
                              <option value="">Team name (optional)</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </>
                        )}
                        <button
                          onClick={() => handleSaveAward(key)}
                          disabled={isSaving}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '10px',
                            backgroundColor: '#15803d',
                            color: '#fff',
                            fontWeight: '800',
                            fontSize: '13px',
                            border: 'none',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSaving ? 'Saving…' : existing ? '✏️ Update' : '✅ Assign'}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Man of the Match — read-only info */}
              {tournament.awards_config?.man_of_match && (
                <div style={{
                  background: 'var(--card)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  opacity: 0.75,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🏅</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--txt)' }}>MAN OF THE MATCH</div>
                      <div style={{ fontSize: '11px', color: 'var(--txt2)', fontWeight: '600' }}>Awarded per match — set when entering match results</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {Object.keys(tournament.awards_config).filter(k => k !== 'man_of_match' && tournament.awards_config[k]?.enabled).length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--txt2)', fontSize: '13px' }}>
                  No tournament-level awards were enabled during setup.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS SECTION ────────────────────────────────────────────────── */}

      {/* Activate Confirmation Modal */}
      {activateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-6">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Activate Tournament?</h2>
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm space-y-2 mb-6">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">Once activated:</p>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 font-semibold space-y-1">
                  <li>Matches will begin</li>
                  <li>Team list will be locked</li>
                  <li>New teams cannot be added</li>
                </ul>
              </div>
              <p className="text-sm font-semibold text-zinc-805 dark:text-zinc-300">
                Are you sure you want to start <span className="font-bold text-green-705">"{tournament.name}"</span>?
              </p>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setActivateModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivate}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15803d'}
              >
                ✅ Yes, Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Complete Modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-6">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Mark as Completed?</h2>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-350">
                This will finalize all league tables, scorers and declare the winners. No more scores can be entered.
              </p>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCompleteModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15803d'}
              >
                🏁 Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {reopenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-6">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Reopen Tournament?</h2>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-350">
                This sets the tournament back to active. You will be able to edit match scores.
              </p>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setReopenModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReopen}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15803d'}
              >
                🔁 Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixture Add / Edit Modal */}
      {fixtureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
              <div className="px-6 py-5 border-b border-[var(--border)] font-extrabold text-lg text-[var(--txt)]">
                {fixtureModal.mode === 'add' ? 'Create New Fixture' : 'Edit Fixture Details'}
              </div>
              <form onSubmit={handleSaveFixture}>
                <div className="p-6 space-y-4">

                  {/* Stage Selector — only for knockout tournaments in manual mode */}
                  {isManualKnockout && (
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">
                        Round / Stage
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {KNOCKOUT_STAGE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFixtureModal({ ...fixtureModal, data: { ...fixtureModal.data, stage: opt.value } })}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '10px',
                              border: fixtureModal.data.stage === opt.value
                                ? '2px solid #7c3aed'
                                : '1.5px solid #e5e7eb',
                              backgroundColor: fixtureModal.data.stage === opt.value
                                ? '#f5f3ff'
                                : '#ffffff',
                              color: fixtureModal.data.stage === opt.value
                                ? '#7c3aed'
                                : '#374151',
                              fontSize: '11px',
                              fontWeight: fixtureModal.data.stage === opt.value ? '800' : '600',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">Team A</label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-bold"
                        value={fixtureModal.data.team_a || ''}
                        onChange={e => {
                          const newTeamA = e.target.value;
                          setFixtureModal({
                            ...fixtureModal,
                            data: {
                              ...fixtureModal.data,
                              team_a: newTeamA,
                              team_b: fixtureModal.data.team_b === newTeamA ? '' : fixtureModal.data.team_b,
                            }
                          });
                        }}
                      >
                        <option value="">Select Team</option>
                        {eligibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">
                        Team B {fixtureModal.data.team_a && groups?.length > 0 && '(Same Group)'}
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-bold"
                        value={fixtureModal.data.team_b || ''}
                        onChange={e => setFixtureModal({ ...fixtureModal, data: { ...fixtureModal.data, team_b: e.target.value } })}
                      >
                        <option value="">Select Team</option>
                        {(() => {
                          const selectedTeamAId = fixtureModal.data.team_a;
                          let availableTeamsForB = eligibleTeams.filter(t => t.id !== selectedTeamAId);

                          // Auto-mode only: restrict Team B to same-round teams
                          if (!isManualKnockout && isKnockoutContext && selectedTeamAId) {
                            const selectedTeamAWins = getWins(selectedTeamAId);
                            availableTeamsForB = availableTeamsForB.filter(t => getWins(t.id) === selectedTeamAWins);
                          }

                          if (selectedTeamAId && groups && groups.length > 0) {
                            const teamAGroup = groups.find(g =>
                              (g.teams || []).some(t => (typeof t === 'object' ? t.id === selectedTeamAId : t === selectedTeamAId))
                            );
                            if (teamAGroup) {
                              const groupTeamIds = (teamAGroup.teams || []).map(t => (typeof t === 'object' ? t.id : t));
                              availableTeamsForB = availableTeamsForB.filter(t => groupTeamIds.includes(t.id));
                            }
                          }

                          return availableTeamsForB.map(t => <option key={t.id} value={t.id}>{t.name}</option>);
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Duplicate Match Warning */}
                  {(() => {
                    const teamA = fixtureModal.data.team_a;
                    const teamB = fixtureModal.data.team_b;
                    if (!teamA || !teamB) return null;

                    const isHomeAndAway = tournament.home_and_away;
                    const existingPairMatches = fixtures.filter(f => {
                      if (fixtureModal.mode === 'edit' && f.id === fixtureModal.data.id) return false;
                      return (f.team_a === teamA && f.team_b === teamB) ||
                             (f.team_a === teamB && f.team_b === teamA);
                    });

                    let warningMsg = null;
                    if (!isHomeAndAway) {
                      if (existingPairMatches.length >= 1) {
                        warningMsg = "(This match already have)";
                      }
                    } else {
                      if (existingPairMatches.length >= 2) {
                        warningMsg = "(This match already have - Maximum 2 Home & Away matches reached)";
                      } else {
                        const exactHomeMatch = existingPairMatches.find(f => f.team_a === teamA && f.team_b === teamB);
                        if (exactHomeMatch) {
                          warningMsg = "(This match already have - Home match already exists)";
                        }
                      }
                    }

                    if (!warningMsg) return null;
                    return (
                      <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: '750', marginTop: '4px', textAlign: 'center' }}>
                        ⚠️ {warningMsg}
                      </div>
                    );
                  })()}

                  {/* Optional Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">
                        Match Date <span className="text-[10px] font-normal text-zinc-400">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                        value={fixtureModal.data.match_date || ''}
                        onChange={e => setFixtureModal({ ...fixtureModal, data: { ...fixtureModal.data, match_date: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--txt2)] mb-1">
                        Match Time <span className="text-[10px] font-normal text-zinc-400">(Optional)</span>
                      </label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                        value={fixtureModal.data.match_time || ''}
                        onChange={e => setFixtureModal({ ...fixtureModal, data: { ...fixtureModal.data, match_time: e.target.value } })}
                      />
                    </div>
                  </div>

                </div>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}>
                <button
                  type="button"
                  onClick={() => setFixtureModal(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15803d'}
                >
                  💾 Save Fixture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-generate confirmation warning modal */}
      {regenerateFixturesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-6">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Seeding / Seeding warning</h2>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-350">
                ⚠️ This will replace all existing scheduled fixtures and randomly draw the brackets. Any saved match results will be cleared. Continue?
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900/80 px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => setRegenerateFixturesModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAutoGenerateFixtures}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow-md"
              >
                Continue Seeding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Result Entry Modal Popup */}
      {resultModal && (
        <MatchResultModal
          fixture={resultModal}
          tournament={{ ...tournament, teams_list: teams }}
          onClose={() => setResultModal(null)}
          onSave={handleSaveResult}
        />
      )}

      {/* Manual Seed Modal */}
      {knockoutSeedModal && leagueStatus?.qualified_teams && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px',
            padding: '24px', width: '100%', maxWidth: '500px',
            maxHeight: '90vh', overflowY: 'auto',
          }} className="text-gray-900 animate-scale-up">
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
              Set Knockout Bracket Manually
            </h2>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              Manually construct the knockout matchups. Select a team for each side of the bracket below.
            </p>

            {/* Custom dropdown-based match builders */}
            <div style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
              {manualMatches.map((match, idx) => (
                <div key={idx} style={{
                  padding: '14px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                    Match {idx + 1}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Team A
                      </label>
                      <select
                        value={match.team_a}
                        onChange={e => handleUpdateManualMatch(idx, 'team_a', e.target.value)}
                        style={{
                          width: 'full', width: '100%', padding: '6px 10px', borderRadius: '8px',
                          border: '1.5px solid #d1d5db', backgroundColor: '#fff',
                          fontSize: '12px', fontWeight: '600', color: '#111827',
                        }}
                      >
                        <option value="">Select Team</option>
                        {leagueStatus.qualified_teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} {t.group ? `(${t.group})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Team B
                      </label>
                      <select
                        value={match.team_b}
                        onChange={e => handleUpdateManualMatch(idx, 'team_b', e.target.value)}
                        style={{
                          width: 'full', width: '100%', padding: '6px 10px', borderRadius: '8px',
                          border: '1.5px solid #d1d5db', backgroundColor: '#fff',
                          fontSize: '12px', fontWeight: '600', color: '#111827',
                        }}
                      >
                        <option value="">Select Team</option>
                        {leagueStatus.qualified_teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} {t.group ? `(${t.group})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error messaging */}
            {(() => {
              const err = getManualSeedingError();
              if (!err) return null;
              return (
                <div style={{
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '10px', padding: '10px 14px',
                  color: '#991b1b', fontSize: '12px', fontWeight: '600',
                  marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  ⚠️ {err}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button"
                onClick={() => setKnockoutSeedModal(false)}
                style={{
                  flex: 1, padding: '11px',
                  backgroundColor: '#fff',
                  color: '#374151',
                  border: '2px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button type="button"
                onClick={handleManualKnockout}
                disabled={generatingKnockout || !!getManualSeedingError()}
                style={{
                  flex: 2, padding: '11px',
                  backgroundColor: !!getManualSeedingError() ? '#9ca3af' : '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700',
                  cursor: !!getManualSeedingError() ? 'not-allowed' : 'pointer',
                }}>
                {generatingKnockout ? 'Creating...' : '⚔️ Create Knockout Bracket'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
