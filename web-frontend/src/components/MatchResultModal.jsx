import { useState, useEffect } from 'react';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

const KNOCKOUT_STAGES = ['quarter', 'semi', 'third_place', 'final', 'round_of_16'];

export default function MatchResultModal({ fixture, tournament, onClose, onSave }) {
  const [scoreA, setScoreA] = useState(fixture.score_a ?? 0);
  const [scoreB, setScoreB] = useState(fixture.score_b ?? 0);
  const [matchDate, setMatchDate] = useState(fixture.match_date || '');
  const [matchTime, setMatchTime] = useState(fixture.match_time || '');
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState('');

  // Penalty / extra-time states (knockout only)
  const [penaltyA, setPenaltyA] = useState(fixture.penalty_score_a ?? '');
  const [penaltyB, setPenaltyB] = useState(fixture.penalty_score_b ?? '');
  const [overrideWinnerId, setOverrideWinnerId] = useState(fixture.winner ?? '');
  
  // Lists for dynamic rows (goals and assists do not store minute)
  const [goals, setGoals] = useState([]);     // [{player_name, player_id, team_id}]
  const [assists, setAssists] = useState([]); // [{player_name, player_id, team_id}]
  const [cards, setCards] = useState([]);     // [{player_name, player_id, team_id, card_type, minute}]
  const [motm, setMotm] = useState(null);     // {player_name, player_id}

  // Prepopulate if editing existing result
  useEffect(() => {
    if (fixture.events && fixture.events.length > 0) {
      const g = [];
      const a = [];
      const c = [];
      
      fixture.events.forEach(event => {
        const row = {
          player_name: event.player_name || '',
          player_id: event.player || '',
          team_id: event.team || '',
          minute: event.minute || '',
          card_type: event.event_type || 'yellow_card',
        };
        if (event.event_type === 'goal') {
          g.push({ player_name: row.player_name, player_id: row.player_id, team_id: row.team_id });
        } else if (event.event_type === 'assist') {
          a.push({ player_name: row.player_name, player_id: row.player_id, team_id: row.team_id });
        } else if (['yellow_card', 'red_card'].includes(event.event_type)) {
          c.push(row);
        }
      });
      setGoals(g);
      setAssists(a);
      setCards(c);
    }
    
    if (fixture.awards && fixture.awards.length > 0) {
      const motmAward = fixture.awards.find(aw => aw.award_type === 'man_of_match');
      if (motmAward) {
        setMotm({
          player_name: motmAward.player_name || '',
          player_id: motmAward.player || '',
        });
      }
    }
  }, [fixture]);

  // Live validation warnings
  useEffect(() => {
    const totalScored = scoreA + scoreB;
    const goalsEntered = goals.length;
    if (goalsEntered > 0 && goalsEntered !== totalScored) {
      setWarning(`⚠️ You've entered ${totalScored} goal(s) but only added ${goalsEntered} scorer(s).`);
    } else {
      setWarning('');
    }
  }, [scoreA, scoreB, goals]);

  // Fetch registered teams in this match
  // Prioritize teams_list (local editable state) over tournament.teams (raw API data with possibly stale names)
  const getTeamId = (teamRef) => typeof teamRef === 'object' && teamRef !== null ? teamRef.id : teamRef;

  const teamAId = getTeamId(fixture.team_a);
  const teamBId = getTeamId(fixture.team_b);

  const teamsList = tournament.teams_list || tournament.teams || [];
  const teamA = teamsList.find(t => String(t.id) === String(teamAId)) || { id: teamAId, name: fixture.team_a_name };
  const teamB = teamsList.find(t => String(t.id) === String(teamBId)) || { id: teamBId, name: fixture.team_b_name };
  
  // Available players list for each team (empty if no players)
  const playersA = teamA.players || [];
  const playersB = teamB.players || [];

  const isKnockout = KNOCKOUT_STAGES.includes(fixture.stage);
  const isDraw = scoreA === scoreB;
  const isKnockoutDraw = isKnockout && isDraw;

  // When penalties are also a draw, winner must be picked manually
  const penANum = parseInt(penaltyA);
  const penBNum = parseInt(penaltyB);
  const penaltyEntered = penaltyA !== '' && penaltyB !== '';
  const penaltyIsDraw = penaltyEntered && !isNaN(penANum) && !isNaN(penBNum) && penANum === penBNum;
  const needsManualWinner = isKnockoutDraw && penaltyIsDraw;

  const handleSave = async () => {
    // Validate: knockout draw must have penalties entered
    if (isKnockoutDraw && (!penaltyEntered || isNaN(penANum) || isNaN(penBNum))) {
      alert('This is a knockout match that ended in a draw. Please enter the penalty shootout scores.');
      return;
    }
    if (needsManualWinner && !overrideWinnerId) {
      alert('The penalty shootout also ended in a draw. Please select the match winner manually.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        score_a: scoreA,
        score_b: scoreB,
        match_date: matchDate || null,
        match_time: matchTime || null,
        // Penalty / winner fields (only sent for knockout draws)
        ...(isKnockoutDraw ? {
          penalty_score_a: penaltyEntered ? penANum : null,
          penalty_score_b: penaltyEntered ? penBNum : null,
          winner_id: overrideWinnerId || null,
        } : {}),
        goals: goals
          .filter(g => g.player_name.trim() !== '')
          .map(g => ({
            player_name: g.player_name.trim(),
            player_id: g.player_id || null,
            team_id: g.team_id || null,
          })),
        assists: assists
          .filter(a => a.player_name.trim() !== '')
          .map(a => ({
            player_name: a.player_name.trim(),
            player_id: a.player_id || null,
            team_id: a.team_id || null,
          })),
        cards: cards
          .filter(c => c.player_name.trim() !== '')
          .map(c => ({
            player_name: c.player_name.trim(),
            player_id: c.player_id || null,
            team_id: c.team_id || null,
            card_type: c.card_type || 'yellow_card',
            minute: c.minute ? parseInt(c.minute) || null : null,
          })),
        man_of_match: motm?.player_name ? {
          player_name: motm.player_name.trim(),
          player_id: motm.player_id || null,
        } : null,
      };

      const response = await api.put(`/fixtures/${fixture.id}/result/`, payload);
      onSave(fixture.id, response.data);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save match result. Please check input data.');
    } finally {
      setSaving(false);
    }
  };

  // Helper row adders & updaters
  const addGoalRow = () => setGoals(prev => [...prev, { player_name: '', player_id: '', team_id: teamA.id }]);
  const removeGoalRow = (idx) => setGoals(prev => prev.filter((_, i) => i !== idx));
  const updateGoalRow = (idx, updates) => {
    setGoals(prev => prev.map((g, i) => {
      if (i === idx) {
        const updated = { ...g, ...updates };
        if (updates.team_id !== undefined && updates.team_id !== g.team_id) {
          updated.player_id = '';
          updated.player_name = '';
        }
        return updated;
      }
      return g;
    }));
  };

  const addAssistRow = () => setAssists(prev => [...prev, { player_name: '', player_id: '', team_id: teamA.id }]);
  const removeAssistRow = (idx) => setAssists(prev => prev.filter((_, i) => i !== idx));
  const updateAssistRow = (idx, updates) => {
    setAssists(prev => prev.map((a, i) => {
      if (i === idx) {
        const updated = { ...a, ...updates };
        if (updates.team_id !== undefined && updates.team_id !== a.team_id) {
          updated.player_id = '';
          updated.player_name = '';
        }
        return updated;
      }
      return a;
    }));
  };

  const addCardRow = () => setCards(prev => [...prev, { player_name: '', player_id: '', team_id: teamA.id, card_type: 'yellow_card', minute: '' }]);
  const removeCardRow = (idx) => setCards(prev => prev.filter((_, i) => i !== idx));
  const updateCardRow = (idx, updates) => {
    setCards(prev => prev.map((c, i) => {
      if (i === idx) {
        const updated = { ...c, ...updates };
        if (updates.team_id !== undefined && updates.team_id !== c.team_id) {
          updated.player_id = '';
          updated.player_name = '';
        }
        return updated;
      }
      return c;
    }));
  };

  // Render a selector or a text input if team has no registered players
  const renderPlayerInput = (row, onUpdateRow, teamId) => {
    const isTeamA = String(teamId) === String(teamA.id);
    const isTeamB = String(teamId) === String(teamB.id);
    const list = isTeamA ? playersA : (isTeamB ? playersB : [...playersA, ...playersB]);

    if (list.length > 0) {
      return (
        <select
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:border-green-600 focus:ring-0 outline-none"
          value={row.player_id || ''}
          onChange={e => {
            const val = e.target.value;
            const matchedPlayer = list.find(p => String(p.id) === String(val));
            if (matchedPlayer) {
              onUpdateRow({ player_id: matchedPlayer.id, player_name: matchedPlayer.name });
            } else {
              onUpdateRow({ player_id: '', player_name: '' });
            }
          }}
        >
          <option value="">Select Player ({list.length} available)</option>
          {list.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      );
    } else {
      return (
        <input
          type="text"
          placeholder="Player name"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-0 outline-none"
          value={row.player_name || ''}
          onChange={e => onUpdateRow({ player_name: e.target.value })}
        />
      );
    }
  };

  const hasPlayers = playersA.length > 0 || playersB.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border)] bg-zinc-50 dark:bg-zinc-900/80">
          <h2 className="text-xl font-extrabold text-[var(--txt)]">Enter Match Result</h2>
          <p className="text-xs text-[var(--txt2)] font-semibold mt-1">
            {fixture.stage_name || fixture.stage} · {fixture.team_a_name} vs {fixture.team_b_name}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Validation Mismatch Warning */}
          {warning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 rounded-xl flex items-center gap-2 text-xs font-bold">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {/* Scores input */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider">Scoreboard</h3>
            <div className="flex items-center justify-center gap-8 py-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl border border-[var(--border)]">
              
              {/* Team A */}
              <div className="flex flex-col items-center gap-2">
                <span className="font-bold text-sm text-[var(--txt)] text-center max-w-[120px] truncate">{fixture.team_a_name}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="w-20 text-3xl font-black text-center py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] rounded-xl focus:border-green-600 focus:ring-0"
                  value={scoreA}
                  onChange={e => { setScoreA(Math.max(0, parseInt(e.target.value) || 0)); setPenaltyA(''); setPenaltyB(''); setOverrideWinnerId(''); }}
                />
              </div>

              <span className="text-2xl font-black text-zinc-400">–</span>

              {/* Team B */}
              <div className="flex flex-col items-center gap-2">
                <span className="font-bold text-sm text-[var(--txt)] text-center max-w-[120px] truncate">{fixture.team_b_name}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="w-20 text-3xl font-black text-center py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] rounded-xl focus:border-green-600 focus:ring-0"
                  value={scoreB}
                  onChange={e => { setScoreB(Math.max(0, parseInt(e.target.value) || 0)); setPenaltyA(''); setPenaltyB(''); setOverrideWinnerId(''); }}
                />
              </div>
            </div>
          </div>

          {/* ── KNOCKOUT DRAW: Penalty Shootout Section ── */}
          {isKnockoutDraw && (
            <div style={{
              backgroundColor: '#fff7ed',
              border: '2px solid #fb923c',
              borderRadius: '16px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>🎯</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#9a3412' }}>Knockout Draw — Penalty Shootout Required</div>
                  <div style={{ fontSize: '11px', color: '#c2410c' }}>This match ended {scoreA}–{scoreB}. Enter the penalty shootout scores below.</div>
                </div>
              </div>

              {/* Penalty Score Inputs */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9a3412', marginBottom: '6px' }}>{fixture.team_a_name}</div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="0"
                    value={penaltyA}
                    onChange={e => { setPenaltyA(e.target.value); setOverrideWinnerId(''); }}
                    style={{
                      width: '72px',
                      textAlign: 'center',
                      fontSize: '28px',
                      fontWeight: '900',
                      padding: '8px',
                      border: '2px solid #fb923c',
                      borderRadius: '12px',
                      backgroundColor: '#fff',
                      color: '#7c2d12',
                      outline: 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#c2410c' }}>–</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9a3412', marginBottom: '6px' }}>{fixture.team_b_name}</div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="0"
                    value={penaltyB}
                    onChange={e => { setPenaltyB(e.target.value); setOverrideWinnerId(''); }}
                    style={{
                      width: '72px',
                      textAlign: 'center',
                      fontSize: '28px',
                      fontWeight: '900',
                      padding: '8px',
                      border: '2px solid #fb923c',
                      borderRadius: '12px',
                      backgroundColor: '#fff',
                      color: '#7c2d12',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Penalty winner preview */}
              {penaltyEntered && !isNaN(penANum) && !isNaN(penBNum) && !penaltyIsDraw && (
                <div style={{
                  textAlign: 'center',
                  padding: '8px 14px',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#15803d',
                }}>
                  🏆 Winner on penalties: {penANum > penBNum ? fixture.team_a_name : fixture.team_b_name}
                </div>
              )}

              {/* Still a draw after penalties — manual winner pick */}
              {needsManualWinner && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px',
                  marginTop: '8px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b', marginBottom: '8px' }}>
                    ⚠️ Penalty shootout also ended in a draw! Manually select the match winner:
                  </div>
                  <select
                    value={overrideWinnerId}
                    onChange={e => setOverrideWinnerId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #fca5a5',
                      backgroundColor: '#fff',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#111827',
                    }}
                  >
                    <option value="">— Select winner —</option>
                    <option value={teamA.id}>{teamA.name}</option>
                    <option value={teamB.id}>{teamB.name}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider mb-1.5">Match Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm font-semibold focus:border-green-600 focus:ring-0"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider mb-1.5">Match Time</label>
              <input
                type="time"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm font-semibold focus:border-green-600 focus:ring-0"
                value={matchTime}
                onChange={e => setMatchTime(e.target.value)}
              />
            </div>
          </div>

          {/* Goal Scorers (NO minute input) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
              <h3 className="text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider">Goal Scorers</h3>
              <button
                type="button"
                onClick={addGoalRow}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add scorer
              </button>
            </div>
            
            {goals.length === 0 ? (
              <p className="text-xs text-[var(--txt2)] font-semibold italic text-center py-2">No scorers added yet.</p>
            ) : (
              <div className="space-y-2">
                {goals.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    
                    {/* Team select */}
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[130px] focus:border-green-600 focus:ring-0 outline-none"
                      value={g.team_id}
                      onChange={e => updateGoalRow(idx, { team_id: e.target.value })}
                    >
                      <option value="">Team</option>
                      <option value={teamA.id}>{teamA.name}</option>
                      <option value={teamB.id}>{teamB.name}</option>
                    </select>

                    {/* Player input */}
                    {renderPlayerInput(g, updates => updateGoalRow(idx, updates), g.team_id)}

                    <button
                      type="button"
                      onClick={() => removeGoalRow(idx)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assists (NO minute input) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
              <h3 className="text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider">Assists</h3>
              <button
                type="button"
                onClick={addAssistRow}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add assist
              </button>
            </div>
            
            {assists.length === 0 ? (
              <p className="text-xs text-[var(--txt2)] font-semibold italic text-center py-2">No assists added yet.</p>
            ) : (
              <div className="space-y-2">
                {assists.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[130px] focus:border-green-600 focus:ring-0 outline-none"
                      value={a.team_id}
                      onChange={e => updateAssistRow(idx, { team_id: e.target.value })}
                    >
                      <option value="">Team</option>
                      <option value={teamA.id}>{teamA.name}</option>
                      <option value={teamB.id}>{teamB.name}</option>
                    </select>

                    {renderPlayerInput(a, updates => updateAssistRow(idx, updates), a.team_id)}

                    <button
                      type="button"
                      onClick={() => removeAssistRow(idx)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cards (Optional minute input) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
              <h3 className="text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider">Bookings / Cards</h3>
              <button
                type="button"
                onClick={addCardRow}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add card
              </button>
            </div>
            
            {cards.length === 0 ? (
              <p className="text-xs text-[var(--txt2)] font-semibold italic text-center py-2">No bookings recorded.</p>
            ) : (
              <div className="space-y-2">
                {cards.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[130px] focus:border-green-600 focus:ring-0 outline-none"
                      value={c.team_id}
                      onChange={e => updateCardRow(idx, { team_id: e.target.value })}
                    >
                      <option value="">Team</option>
                      <option value={teamA.id}>{teamA.name}</option>
                      <option value={teamB.id}>{teamB.name}</option>
                    </select>

                    {renderPlayerInput(c, updates => updateCardRow(idx, updates), c.team_id)}

                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-0 outline-none"
                      value={c.card_type}
                      onChange={e => updateCardRow(idx, { card_type: e.target.value })}
                    >
                      <option value="yellow_card">🟨 Yellow</option>
                      <option value="red_card">🟥 Red</option>
                    </select>

                    <input
                      type="number"
                      value={c.minute || ''}
                      onChange={e => updateCardRow(idx, { minute: e.target.value })}
                      placeholder="Min (opt)"
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-0 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => removeCardRow(idx)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Man of the Match */}
          {tournament.awards_config?.man_of_match && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold text-[var(--txt2)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">Man of the Match</h3>
              <div className="flex gap-4">
                {hasPlayers ? (
                  <select
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:border-green-600 focus:ring-0 outline-none"
                    value={motm?.player_id || ''}
                    onChange={e => {
                      const allPlayers = [...playersA, ...playersB];
                      const matched = allPlayers.find(p => p.id === e.target.value);
                      if (matched) setMotm({ player_id: matched.id, player_name: matched.name });
                      else setMotm(null);
                    }}
                  >
                    <option value="">Select MOTM Player</option>
                    <optgroup label={teamA.name}>
                      {playersA.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                    <optgroup label={teamB.name}>
                      {playersB.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Man of the Match Player Name"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-0 outline-none"
                    value={motm?.player_name || ''}
                    onChange={e => setMotm({ player_id: '', player_name: e.target.value })}
                  />
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
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
            onClick={onClose}
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
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#15803d',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '800',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#166534'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = '#15803d'; }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #ffffff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span>Saving...</span>
              </>
            ) : (
              <span>💾 Save Result</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
