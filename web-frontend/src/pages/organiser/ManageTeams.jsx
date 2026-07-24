import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { Plus, User, Trash2, ShieldCheck } from 'lucide-react';

export default function ManageTeams({ tournament }) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(null); // team id
  const [teamName, setTeamName] = useState('');
  const [playerForm, setPlayerForm] = useState({ name: '', jersey_number: '', position: 'forward', age: '' });

  const fetchTeams = () => {
    api.get(`/teams/?tournament=${tournament.id}`)
      .then(res => setTeams(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeams(); }, [tournament.id]);

  const handleAddTeam = async () => {
    if (!teamName.trim()) return;
    try {
      await api.post('/teams/', { name: teamName, tournament: tournament.id });
      setTeamName('');
      setShowAddTeam(false);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating team');
    }
  };

  const handleAddPlayer = async (teamId) => {
    if (!playerForm.name.trim()) return;
    try {
      await api.post('/teams/players/', { ...playerForm, team: teamId });
      setPlayerForm({ name: '', jersey_number: '', position: 'forward', age: '' });
      setShowAddPlayer(null);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error adding player');
    }
  };

  const handleVerifyPlayer = async (playerId) => {
    try {
      await api.patch(`/teams/players/${playerId}/verify/`);
      fetchTeams();
    } catch (err) {
      alert('Error verifying player');
    }
  };

  if (loading) return <div className="text-center py-10 text-[var(--txt2)]">Loading teams...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Teams ({teams.length})</h2>
        <button
          onClick={() => setShowAddTeam(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} /> Add Team
        </button>
      </div>

      {/* Add Team Modal */}
      {showAddTeam && (
        <div className="mb-4 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
          <h3 className="font-bold mb-3">New Team</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Team name"
              className="flex-1 rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
            />
            <button onClick={handleAddTeam} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">Create</button>
            <button onClick={() => setShowAddTeam(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg2)] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)]">
          <Users size={40} className="mx-auto text-[var(--txt2)] mb-3" />
          <p className="font-semibold">No teams yet</p>
          <p className="text-sm text-[var(--txt2)] mt-1">Add teams to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.id} className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Team Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg2)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{team.name}</p>
                    <p className="text-xs text-[var(--txt2)]">{team.players?.length || 0} players</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddPlayer(team.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 transition-colors"
                >
                  <Plus size={14} /> Add Player
                </button>
              </div>

              {/* Add Player Form */}
              {showAddPlayer === team.id && (
                <div className="p-4 border-b border-[var(--border)] bg-blue-50">
                  <h4 className="font-semibold mb-3 text-sm">Add Player to {team.name}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      className="col-span-2 rounded-md border-gray-300 text-sm"
                      value={playerForm.name}
                      onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Jersey #"
                      className="rounded-md border-gray-300 text-sm"
                      value={playerForm.jersey_number}
                      onChange={e => setPlayerForm({ ...playerForm, jersey_number: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      className="rounded-md border-gray-300 text-sm"
                      value={playerForm.age}
                      onChange={e => setPlayerForm({ ...playerForm, age: e.target.value })}
                    />
                    <select
                      className="col-span-2 rounded-md border-gray-300 text-sm"
                      value={playerForm.position}
                      onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })}
                    >
                      {['goalkeeper', 'defender', 'midfielder', 'forward'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAddPlayer(team.id)} className="px-4 py-1.5 bg-primary-600 text-white rounded text-sm font-medium hover:bg-primary-700 transition-colors">Save</button>
                    <button onClick={() => setShowAddPlayer(null)} className="px-4 py-1.5 border rounded text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              {/* Players List */}
              <div className="divide-y divide-[var(--border)]">
                {(team.players || []).map(player => (
                  <div key={player.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg2)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                        {player.jersey_number || '?'}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{player.name}</span>
                        <span className="ml-2 text-xs text-[var(--txt2)] capitalize">{player.position}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tournament.age_verification_required && (
                        <button
                          onClick={() => handleVerifyPlayer(player.id)}
                          title="Verify player age"
                          className={`p-1.5 rounded ${player.is_verified ? 'text-green-500' : 'text-gray-400 hover:text-green-500'} transition-colors`}
                        >
                          <ShieldCheck size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(team.players || []).length === 0 && (
                  <div className="px-4 py-3 text-sm text-[var(--txt2)] text-center italic">No players yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
