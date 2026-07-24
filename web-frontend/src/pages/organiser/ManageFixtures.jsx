import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import FixtureCard from '../../components/FixtureCard';
import MatchCard from '../../components/MatchCard';
import { Zap, Edit } from 'lucide-react';

export default function ManageFixtures({ tournament }) {
  const { t } = useTranslation();
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editFixture, setEditFixture] = useState(null);
  const [resultForm, setResultForm] = useState({ score_a: 0, score_b: 0, status: 'completed', motm: '' });
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ event_type: 'goal', player: '', team: '', minute: '' });

  const fetchAll = () => {
    Promise.all([
      api.get(`/fixtures/?tournament=${tournament.id}`),
      api.get(`/teams/?tournament=${tournament.id}`)
    ]).then(([fx, tm]) => {
      setFixtures(fx.data);
      setTeams(tm.data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [tournament.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post(`/fixtures/generate/`, { tournament: tournament.id });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Error generating fixtures');
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (fixture) => {
    setEditFixture(fixture);
    setResultForm({ score_a: fixture.score_a || 0, score_b: fixture.score_b || 0, status: 'completed', motm: fixture.motm || '' });
    setEvents([]);
  };

  const handleSaveResult = async () => {
    try {
      // Save match result
      await api.patch(`/fixtures/${editFixture.id}/`, resultForm);

      // Save all events
      for (const ev of events) {
        await api.post('/fixtures/events/', { ...ev, fixture: editFixture.id });
      }

      setEditFixture(null);
      setEvents([]);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving result');
    }
  };

  const addEvent = () => {
    if (!newEvent.player || !newEvent.minute) return;
    setEvents(prev => [...prev, { ...newEvent }]);
    setNewEvent({ event_type: 'goal', player: '', team: '', minute: '' });
  };

  const upcoming = fixtures.filter(f => f.status !== 'completed');
  const completed = fixtures.filter(f => f.status === 'completed');

  if (loading) return <div className="text-center py-10 text-[var(--txt2)]">Loading fixtures...</div>;

  return (
    <div>
      {/* Generate Button */}
      {fixtures.length === 0 && (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)] mb-6">
          <div className="text-5xl mb-4">📅</div>
          <p className="font-bold text-lg mb-2">No fixtures generated yet</p>
          <p className="text-[var(--txt2)] mb-6 text-sm">Make sure you have added at least 2 teams before generating.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors mx-auto"
          >
            <Zap size={18} /> {generating ? 'Generating...' : 'Generate Fixtures'}
          </button>
        </div>
      )}

      {fixtures.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Fixtures ({fixtures.length})</h2>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-sm font-medium rounded-lg hover:bg-[var(--bg2)] disabled:opacity-40 transition-colors"
          >
            <Zap size={16} /> {generating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      )}

      {/* Edit Result Modal */}
      {editFixture && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditFixture(null)}>
          <div className="bg-[var(--card)] rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">
              {editFixture.team_a_name} vs {editFixture.team_b_name}
            </h3>

            {/* Score */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-[var(--txt2)] mb-1">{editFixture.team_a_name}</p>
                <input
                  type="number"
                  min="0"
                  className="w-20 text-center text-2xl font-bold rounded-xl border-2 border-primary-300 focus:border-primary-600"
                  value={resultForm.score_a}
                  onChange={e => setResultForm({ ...resultForm, score_a: parseInt(e.target.value) || 0 })}
                />
              </div>
              <span className="text-xl font-bold text-[var(--txt2)]">—</span>
              <div className="text-center">
                <p className="text-sm text-[var(--txt2)] mb-1">{editFixture.team_b_name}</p>
                <input
                  type="number"
                  min="0"
                  className="w-20 text-center text-2xl font-bold rounded-xl border-2 border-primary-300 focus:border-primary-600"
                  value={resultForm.score_b}
                  onChange={e => setResultForm({ ...resultForm, score_b: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Man of the Match */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-1">Man of the Match</label>
              <input
                type="text"
                placeholder="Player name"
                className="w-full rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm"
                value={resultForm.motm}
                onChange={e => setResultForm({ ...resultForm, motm: e.target.value })}
              />
            </div>

            {/* Events */}
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2">Match Events</p>
              <div className="space-y-2 mb-3">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-[var(--bg2)] rounded-lg p-2">
                    <span>{ev.event_type === 'goal' ? '⚽' : ev.event_type === 'yellow_card' ? '🟨' : '🟥'}</span>
                    <span className="font-medium">{ev.player}</span>
                    <span className="text-[var(--txt2)]">{ev.minute}'</span>
                    <button onClick={() => setEvents(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <select
                  className="rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm"
                  value={newEvent.event_type}
                  onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}
                >
                  <option value="goal">⚽ Goal</option>
                  <option value="yellow_card">🟨 Yellow</option>
                  <option value="red_card">🟥 Red</option>
                </select>
                <input
                  type="text"
                  placeholder="Player name"
                  className="rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm"
                  value={newEvent.player}
                  onChange={e => setNewEvent({ ...newEvent, player: e.target.value })}
                />
                <select
                  className="rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm"
                  value={newEvent.team}
                  onChange={e => setNewEvent({ ...newEvent, team: e.target.value })}
                >
                  <option value="">Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Min"
                  min="1"
                  max="120"
                  className="rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm"
                  value={newEvent.minute}
                  onChange={e => setNewEvent({ ...newEvent, minute: e.target.value })}
                />
              </div>
              <button onClick={addEvent} className="mt-2 px-3 py-1.5 text-sm bg-[var(--bg2)] border border-[var(--border)] rounded-md hover:bg-[var(--border)] font-medium transition-colors">
                + Add Event
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditFixture(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(21,128,61,0.25)',
                }}
              >
                💾 Save Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Fixtures */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h3 className="text-base font-bold text-[var(--txt2)] uppercase tracking-wider mb-3">{t('upcoming')}</h3>
          <div className="space-y-3">
            {upcoming.map(fixture => (
              <div key={fixture.id} className="relative">
                <FixtureCard fixture={fixture} tournamentName={tournament.name} tournamentId={tournament.id} />
                <button
                  onClick={() => openEdit(fixture)}
                  className="absolute top-4 right-16 flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 transition-colors"
                >
                  <Edit size={13} /> Enter Result
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Fixtures */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-[var(--txt2)] uppercase tracking-wider mb-3">{t('results')}</h3>
          <div className="space-y-3">
            {completed.map(fixture => (
              <MatchCard key={fixture.id} match={fixture} tournamentName={tournament.name} tournamentId={tournament.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
