import { useState, useEffect } from 'react';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

const KNOCKOUT_STAGES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'];

export default function MatchResultModal({ fixture, tournament, onClose, onSave }) {
  const getTeamId = (teamRef) => typeof teamRef === 'object' && teamRef !== null ? teamRef.id : teamRef;

  const teamAId = getTeamId(fixture.team_a);
  const teamBId = getTeamId(fixture.team_b);

  const teamsList = tournament.teams_list || tournament.teams || [];
  const teamA = teamsList.find(t => String(t.id) === String(teamAId)) || { id: teamAId, name: fixture.team_a_name };
  const teamB = teamsList.find(t => String(t.id) === String(teamBId)) || { id: teamBId, name: fixture.team_b_name };
  
  // Available players list for each team (empty if no players)
  const playersA = teamA.players || [];
  const playersB = teamB.players || [];

  const [scoreA, setScoreA] = useState(fixture.score_a ?? 0);
  const [scoreB, setScoreB] = useState(fixture.score_b ?? 0);
  const [matchDate, setMatchDate] = useState(fixture.match_date || '');
  const [matchTime, setMatchTime] = useState(fixture.match_time || '');
  const [saving, setSaving] = useState(false);
  const [goalCountWarning, setGoalCountWarning] = useState('');

  // Penalty / extra-time states (knockout only)
  const [penaltyA, setPenaltyA] = useState(fixture.penalty_score_a ?? '');
  const [penaltyB, setPenaltyB] = useState(fixture.penalty_score_b ?? '');
  const [overrideWinnerId, setOverrideWinnerId] = useState(fixture.winner ?? '');
  
  // Split scorer lists by team instead of one shared list
  const [goalsTeamA, setGoalsTeamA] = useState([]);
  const [goalsTeamB, setGoalsTeamB] = useState([]);
  const [assists, setAssists] = useState([]); // [{player_name, player_id, team_id}]
  const [cards, setCards] = useState([]);     // [{player_name, player_id, team_id, card_type, minute}]
  const [motm, setMotm] = useState(null);     // {player_name, player_id}
  const [assistsExpanded, setAssistsExpanded] = useState(false);

  // Prepopulate if editing existing result
  useEffect(() => {
    if (fixture.events && fixture.events.length > 0) {
      const gA = [];
      const gB = [];
      const a = [];
      const c = [];
      
      fixture.events.forEach(event => {
        const row = {
          player_name: event.player_name || '',
          player_id: event.player || '',
          team_id: event.team_id || event.team || '',
          minute: event.minute || '',
          card_type: event.event_type || 'yellow_card',
        };
        if (event.event_type === 'goal') {
          if (String(row.team_id) === String(teamAId)) {
            gA.push({ player_name: row.player_name, player_id: row.player_id, team_id: row.team_id });
          } else if (String(row.team_id) === String(teamBId)) {
            gB.push({ player_name: row.player_name, player_id: row.player_id, team_id: row.team_id });
          }
        } else if (event.event_type === 'assist') {
          a.push({ player_name: row.player_name, player_id: row.player_id, team_id: row.team_id });
        } else if (['yellow_card', 'red_card'].includes(event.event_type)) {
          c.push(row);
        }
      });
      setGoalsTeamA(gA);
      setGoalsTeamB(gB);
      setAssists(a);
      setCards(c);
      
      if (a.length > 0) {
        setAssistsExpanded(true);
      }
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
    const scorersA = goalsTeamA.filter(g => g.player_name.trim()).length;
    const scorersB = goalsTeamB.filter(g => g.player_name.trim()).length;

    let warning = '';
    if (scorersA > 0 && scorersA !== scoreA) {
      warning = `${fixture.team_a_name} score is ${scoreA} but ${scorersA} scorer(s) added.`;
    } else if (scorersB > 0 && scorersB !== scoreB) {
      warning = `${fixture.team_b_name} score is ${scoreB} but ${scorersB} scorer(s) added.`;
    }
    setGoalCountWarning(warning);
  }, [scoreA, scoreB, goalsTeamA, goalsTeamB]);

  const isKnockout = tournament?.tournament_type === 'knockout' || KNOCKOUT_STAGES.includes(fixture.stage);
  const isDraw = scoreA === scoreB;
  const isKnockoutDraw = isKnockout && isDraw;

  // When penalties are also a draw, winner must be picked manually
  const penANum = parseInt(penaltyA);
  const penBNum = parseInt(penaltyB);
  const penaltyEntered = penaltyA !== '' && penaltyB !== '';
  const penaltyIsDraw = penaltyEntered && !isNaN(penANum) && !isNaN(penBNum) && penANum === penBNum;
  const needsManualWinner = isKnockoutDraw && penaltyIsDraw;

  const handleSave = async () => {
    // Validate: knockout draw must have penalties entered (legacy check fallback)
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
        goals: [
          ...goalsTeamA.filter(g => g.player_name.trim()).map(g => ({
            player_name: g.player_name.trim(),
            player_id: g.player_id || null,
            team_id: fixture.team_a_id || teamA.id,
          })),
          ...goalsTeamB.filter(g => g.player_name.trim()).map(g => ({
            player_name: g.player_name.trim(),
            player_id: g.player_id || null,
            team_id: fixture.team_b_id || teamB.id,
          })),
        ],
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
      window.dispatchEvent(new Event('bracket:refresh'));
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      const errMsg = err.response?.data?.error || 'Failed to save match result. Please check input data.';
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Helper goal/assist row adders & updaters
  const addGoalFor = (side) => {
    const setter = side === 'a' ? setGoalsTeamA : setGoalsTeamB;
    setter(prev => [...prev, { player_name: '', player_id: '', team_id: side === 'a' ? teamA.id : teamB.id }]);
  };

  const updateGoalFor = (side, index, val) => {
    const setter = side === 'a' ? setGoalsTeamA : setGoalsTeamB;
    setter(prev => prev.map((g, i) => {
      if (i === index) {
        if (typeof val === 'object' && val !== null) {
          return { ...g, player_name: val.player_name, player_id: val.player_id };
        } else {
          return { ...g, player_name: val, player_id: '' };
        }
      }
      return g;
    }));
  };

  const removeGoalFor = (side, index) => {
    const setter = side === 'a' ? setGoalsTeamA : setGoalsTeamB;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const addAssist = () => {
    setAssists(prev => [...prev, { player_name: '', player_id: '', team_id: '' }]);
  };

  const removeAssist = (index) => {
    setAssists(prev => prev.filter((_, i) => i !== index));
  };

  const updateAssist = (index, field, val) => {
    setAssists(prev => prev.map((a, i) => {
      if (i === index) {
        if (field === 'player_name') {
          if (typeof val === 'object' && val !== null) {
            return { ...a, player_name: val.player_name, player_id: val.player_id };
          } else {
            return { ...a, player_name: val, player_id: '' };
          }
        }
        return { ...a, [field]: val };
      }
      return a;
    }));
  };

  // Helper card row updaters (keep cards as they were)
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

  const PlayerSelector = ({ value, onChange, teamId, placeholder }) => {
    const isTeamA = String(teamId) === String(teamA.id);
    const isTeamB = String(teamId) === String(teamB.id);
    const list = isTeamA ? playersA : (isTeamB ? playersB : [...playersA, ...playersB]);
    const matched = list.find(p => p.name === value);
    const selectedId = matched ? matched.id : '';

    if (list.length > 0) {
      return (
        <select
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:border-green-600 focus:ring-0 outline-none"
          value={selectedId}
          onChange={e => {
            const val = e.target.value;
            const matchedPlayer = list.find(p => String(p.id) === String(val));
            if (matchedPlayer) {
              onChange({ player_id: matchedPlayer.id, player_name: matchedPlayer.name });
            } else {
              onChange({ player_id: '', player_name: '' });
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
          placeholder={placeholder || "Player name"}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-0 outline-none text-black"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }
  };

  // Render player input specifically for card rows which still use it
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
          
          {/* Goal count warning */}
          {goalCountWarning && (
            <div style={{
              fontSize: '11px', color: '#b45309',
              backgroundColor: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '8px', padding: '6px 10px',
              marginBottom: '14px',
            }}>
              ⚠️ {goalCountWarning}
            </div>
          )}

          {/* ── SCOREBOARD WITH PER-TEAM SCORERS ── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '11px', fontWeight: '700', color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px',
            }}>
              Scoreboard
            </div>

            {/* Two-column team layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              backgroundColor: '#f9fafb',
              borderRadius: '14px',
              padding: '16px',
            }}>

              {/* ── TEAM A COLUMN ── */}
              <div>
                <div style={{
                  fontSize: '13px', fontWeight: '700', color: '#111827',
                  textAlign: 'center', marginBottom: '8px',
                }}>
                  {fixture.team_a_name}
                </div>

                {/* Score input */}
                <input
                  type="number"
                  min={0} max={40}
                  value={scoreA}
                  onChange={e => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setScoreA(val);
                    setPenaltyA('');
                    setPenaltyB('');
                    setOverrideWinnerId('');
                  }}
                  style={{
                    width: '100%', textAlign: 'center',
                    fontSize: '28px', fontWeight: '800', color: '#111827',
                    padding: '10px', borderRadius: '10px',
                    border: '2px solid #e5e7eb', backgroundColor: '#ffffff',
                    outline: 'none', marginBottom: '10px',
                  }}
                />

                {/* Team A scorer list — directly under Team A's score */}
                <div style={{
                  backgroundColor: '#ffffff', borderRadius: '10px',
                  border: '1px solid #e5e7eb', padding: '8px',
                }}>
                  <div style={{
                    fontSize: '10px', fontWeight: '700', color: '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    marginBottom: '6px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    ⚽ Scorers
                    <button type="button" onClick={() => addGoalFor('a')}
                      style={{
                        background: 'none', border: 'none', color: '#15803d',
                        fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                      }}>
                      + Add
                    </button>
                  </div>

                  {goalsTeamA.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '6px 0' }}>
                      No scorers yet
                    </div>
                  ) : (
                    goalsTeamA.map((goal, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
                      }}>
                        <PlayerSelector
                          value={goal.player_name}
                          onChange={val => updateGoalFor('a', i, val)}
                          teamId={teamA.id}
                          placeholder="Player name"
                        />
                        <button type="button" onClick={() => removeGoalFor('a', i)}
                          style={{
                            background: '#fff1f2', border: '1px solid #fecaca',
                            borderRadius: '6px', color: '#dc2626',
                            width: '26px', height: '26px', flexShrink: 0,
                            cursor: 'pointer', fontSize: '12px',
                          }}>
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── TEAM B COLUMN ── */}
              <div>
                <div style={{
                  fontSize: '13px', fontWeight: '700', color: '#111827',
                  textAlign: 'center', marginBottom: '8px',
                }}>
                  {fixture.team_b_name}
                </div>

                <input
                  type="number"
                  min={0} max={40}
                  value={scoreB}
                  onChange={e => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setScoreB(val);
                    setPenaltyA('');
                    setPenaltyB('');
                    setOverrideWinnerId('');
                  }}
                  style={{
                    width: '100%', textAlign: 'center',
                    fontSize: '28px', fontWeight: '800', color: '#111827',
                    padding: '10px', borderRadius: '10px',
                    border: '2px solid #e5e7eb', backgroundColor: '#ffffff',
                    outline: 'none', marginBottom: '10px',
                  }}
                />

                <div style={{
                  backgroundColor: '#ffffff', borderRadius: '10px',
                  border: '1px solid #e5e7eb', padding: '8px',
                }}>
                  <div style={{
                    fontSize: '10px', fontWeight: '700', color: '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    marginBottom: '6px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    ⚽ Scorers
                    <button type="button" onClick={() => addGoalFor('b')}
                      style={{
                        background: 'none', border: 'none', color: '#15803d',
                        fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                      }}>
                      + Add
                    </button>
                  </div>

                  {goalsTeamB.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '6px 0' }}>
                      No scorers yet
                    </div>
                  ) : (
                    goalsTeamB.map((goal, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
                      }}>
                        <PlayerSelector
                          value={goal.player_name}
                          onChange={val => updateGoalFor('b', i, val)}
                          teamId={teamB.id}
                          placeholder="Player name"
                        />
                        <button type="button" onClick={() => removeGoalFor('b', i)}
                          style={{
                            background: '#fff1f2', border: '1px solid #fecaca',
                            borderRadius: '6px', color: '#dc2626',
                            width: '26px', height: '26px', flexShrink: 0,
                            cursor: 'pointer', fontSize: '12px',
                          }}>
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
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
              marginBottom: '20px',
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
          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '20px' }}>
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

          {/* ── ASSISTS — secondary section, collapsed by default ── */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setAssistsExpanded(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>
                🅰️ Assists <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {assistsExpanded ? '▲ Hide' : `▼ ${assists.length > 0 ? `${assists.length} added` : 'Add'}`}
              </span>
            </button>

            {assistsExpanded && (
              <div style={{
                border: '1px solid #e5e7eb', borderTop: 'none',
                borderRadius: '0 0 10px 10px', padding: '12px 14px',
              }}>
                {assists.map((assist, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <select
                      value={assist.team_id}
                      onChange={e => updateAssist(i, 'team_id', e.target.value)}
                      style={{
                        width: '130px', flexShrink: 0, padding: '8px 10px',
                        borderRadius: '8px', border: '1.5px solid #e5e7eb',
                        fontSize: '12px', color: assist.team_id ? '#111827' : '#9ca3af',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="" style={{ color: '#9ca3af' }}>Team</option>
                      <option value={teamA.id} style={{ color: '#111827' }}>{teamA.name}</option>
                      <option value={teamB.id} style={{ color: '#111827' }}>{teamB.name}</option>
                    </select>
                    <PlayerSelector
                      value={assist.player_name}
                      onChange={val => updateAssist(i, 'player_name', val)}
                      teamId={assist.team_id}
                      placeholder="Player name"
                    />
                    <button type="button" onClick={() => removeAssist(i)}
                      style={{
                        background: '#fff1f2', border: '1px solid #fecaca',
                        borderRadius: '6px', color: '#dc2626',
                        width: '26px', height: '26px', flexShrink: 0,
                        cursor: 'pointer', fontSize: '12px',
                      }}>
                      🗑
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addAssist}
                  style={{
                    background: 'none', border: 'none', color: '#15803d',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: '4px 0',
                  }}>
                  + Add assist
                </button>
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
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[130px] focus:border-green-600 focus:ring-0 outline-none bg-white text-gray-900"
                      value={c.team_id}
                      onChange={e => updateCardRow(idx, { team_id: e.target.value })}
                    >
                      <option value="" className="text-gray-400">Team</option>
                      <option value={teamA.id} className="text-gray-900">{teamA.name}</option>
                      <option value={teamB.id} className="text-gray-900">{teamB.name}</option>
                    </select>

                    {renderPlayerInput(c, updates => updateCardRow(idx, updates), c.team_id)}

                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-0 outline-none bg-white text-gray-900"
                      value={c.card_type}
                      onChange={e => updateCardRow(idx, { card_type: e.target.value })}
                    >
                      <option value="yellow_card" className="text-gray-900">🟨 Yellow</option>
                      <option value="red_card" className="text-gray-900">🟥 Red</option>
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
