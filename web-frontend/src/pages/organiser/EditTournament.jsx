import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, Shield, Info, Lock, Award, Trophy, Users, Star } from 'lucide-react';

const GROUND_TYPES = ['3s', '5s', '6s', '7s', '9s', '11s'];

const AGE_CATEGORIES = [
  { value: 'U7',       label: 'Under 7' },
  { value: 'U8',       label: 'Under 8' },
  { value: 'U9',       label: 'Under 9' },
  { value: 'U10',      label: 'Under 10' },
  { value: 'U11',      label: 'Under 11' },
  { value: 'U12',      label: 'Under 12' },
  { value: 'U13',      label: 'Under 13' },
  { value: 'U14',      label: 'Under 14' },
  { value: 'U15',      label: 'Under 15' },
  { value: 'U16',      label: 'Under 16' },
  { value: 'U17',      label: 'Under 17' },
  { value: 'U18',      label: 'Under 18' },
  { value: 'U19',      label: 'Under 19' },
  { value: 'U20',      label: 'Under 20' },
  { value: 'U21',      label: 'Under 21' },
  { value: 'U22',      label: 'Under 22' },
  { value: 'U23',      label: 'Under 23' },
  { value: 'Open',     label: 'Open (no age restriction)' },
  { value: 'Veterans', label: 'Veterans (40+)' },
];

const AWARDS_LIST = [
  { key: 'top_scorer',       name: 'Top Scorer',              icon: '⚽' },
  { key: 'best_gk',          name: 'Best Goalkeeper',         icon: '🧤' },
  { key: 'best_defender',    name: 'Best Defender',           icon: '🛡️' },
  { key: 'best_midfielder',  name: 'Best Midfielder',         icon: '🎯' },
  { key: 'best_player',      name: 'Best Player (Overall)',   icon: '🌟' },
  { key: 'best_team',        name: 'Best Team',               icon: '🏅' },
  { key: 'emerging_player',  name: 'Emerging Player',         icon: '⭐' },
  { key: 'fair_play',        name: 'Fair Play Award',         icon: '🤝' },
];

// Helper calculations for league and knockout fixture estimations
function leagueMatchCount(n, homeAndAway = false) {
  const pairs = (n * (n - 1)) / 2;
  return homeAndAway ? pairs * 2 : pairs;
}

function knockoutMatchCount(n) {
  if (n < 2) return 0;
  const pow2 = Math.pow(2, Math.ceil(Math.log2(n)));
  return pow2 - 1;
}

export const EditTournament = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formatLocked, setFormatLocked] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/edit-info/`);
        
        // Ensure default awards_config and stats_config keys are populated if not exist
        const defaultAwards = {
          man_of_match: true,
          top_scorer:      { enabled: true,  per_match: false, overall: true },
          best_gk:         { enabled: true,  per_match: false, overall: true },
          best_defender:   { enabled: false, per_match: false, overall: false },
          best_midfielder: { enabled: false, per_match: false, overall: false },
          best_player:     { enabled: true,  per_match: false, overall: true },
          best_team:       { enabled: false, per_match: false, overall: false },
          emerging_player: { enabled: false, per_match: false, overall: false },
          fair_play:       { enabled: false, per_match: false, overall: false },
        };
        const defaultStats = {
          goals:              { track: true,  show: true },
          assists:            { track: true,  show: true },
          goal_contributions: { track: false, show: true },
          yellow_cards:       { track: true,  show: false },
          red_cards:          { track: true,  show: false },
          clean_sheets:       { track: false, show: false },
          saves:              { track: false, show: false },
          man_of_the_match:   { track: true,  show: true },
        };

        const rawData = res.data;
        rawData.awards_config = { ...defaultAwards, ...(rawData.awards_config || {}) };
        rawData.stats_config = { ...defaultStats, ...(rawData.stats_config || {}) };
        if (!rawData.team_names_list) {
          rawData.team_names_list = [];
        }

        setFormData(rawData);
        setFormatLocked(res.data.format_locked);
        setCompletedCount(res.data.completed_matches_count);
        setTotalCount(res.data.total_matches_count);
      } catch (err) {
        showToast('Failed to load tournament.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [id]);

  // Compute total auto fixtures estimate
  const fixtureEstimate = useMemo(() => {
    if (!formData) return null;
    const n = formData.max_teams;
    const ha = formData.home_and_away;
    const type = formData.tournament_type;
    const style = formData.league_knockout_style;
    const ng = formData.num_groups || 4;
    const qpg = formData.qualifiers_per_group || 2;

    if (!type) return null;

    if (type === 'league') {
      const m = leagueMatchCount(n, ha);
      return { total: m, desc: `${n} teams, round-robin${ha ? ' (home & away)' : ''}` };
    }

    if (type === 'knockout') {
      const m = knockoutMatchCount(n);
      const r = Math.ceil(Math.log2(n));
      return { total: m, desc: `${n} teams, ${r} rounds, single-elimination bracket` };
    }

    if (type === 'league_knockout') {
      if (style === 'multi_group') {
        const teamsPerGroup = Math.ceil(n / ng);
        const groupMatches = ng * leagueMatchCount(teamsPerGroup, ha);
        const totalQualifiers = ng * qpg;
        const koMatches = knockoutMatchCount(totalQualifiers);
        return {
          total: groupMatches + koMatches,
          desc: `${ng} groups × ~${teamsPerGroup} teams → ${totalQualifiers} qualify → knockout`,
        };
      } else {
        // single group
        const leagueM = leagueMatchCount(n, ha);
        const koM = knockoutMatchCount(qpg);
        return {
          total: leagueM + koM,
          desc: `League phase (${n} teams) + knockout (top ${qpg})`,
        };
      }
    }

    return null;
  }, [formData]);

  const updateField = (field, value) => {
    setFormData(prev => {
      if (field === 'age_category' && ['Open', 'Veterans'].includes(value)) {
        return {
          ...prev,
          [field]: value,
          age_verification_required: false,
          accept_aadhaar: false,
          accept_school_certificate: false,
          accept_birth_certificate: false,
        };
      }
      return { ...prev, [field]: value };
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await api.patch(`/tournaments/${id}/`, formData);
      if (res.data.format_changed) {
        showToast(
          `Format updated! ${res.data.deleted_fixtures} old fixture(s) removed — generate new fixtures from the Fixtures tab.`,
          'success'
        );
      } else {
        showToast('Tournament updated successfully.', 'success');
      }
      setTimeout(() => navigate(`/organiser/tournament/${id}/manage`), 1500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error) {
        showToast(data.error, 'error');
      } else {
        setErrors(data || {});
        showToast('Please fix the errors and try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-[var(--txt2)]">
        <div className="animate-spin text-4xl mb-4 text-emerald-600">⚽</div>
        <p className="font-semibold text-sm">Loading tournament...</p>
      </div>
    );
  }

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={!disabled ? onChange : undefined}
      style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: disabled ? '#d1d5db' : checked ? '#15803d' : '#d1d5db',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
        padding: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left 0.2s ease',
        display: 'block',
      }} />
    </button>
  );

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px 80px' }} className="text-[var(--txt)]">
      
      {/* Back link & Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate(`/organiser/tournament/${id}/manage`)}
          style={{
            background: 'none', border: 'none', color: 'var(--txt2)',
            fontSize: '13px', cursor: 'pointer', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontWeight: '600'
          }}
          className="hover:underline"
        >
          <ArrowLeft size={14} /> Back to Manage
        </button>
        <h1 className="text-3xl font-black tracking-tight">
          Edit Tournament
        </h1>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm mt-0.5">
          {formData.name}
        </p>
      </div>

      {errors.error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errors.error}</span>
        </div>
      )}

      {/* ── Basic Info Section ── */}
      <Section title="Basic Information">
        <FieldGroup label="Tournament Name" required>
          <input
            type="text"
            value={formData.name}
            onChange={e => updateField('name', e.target.value)}
            style={inputStyle}
            className="focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-medium"
          />
          {errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name}</p>}
        </FieldGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FieldGroup label="Organising Team / Area">
            <input
              type="text"
              value={formData.area_name}
              onChange={e => updateField('area_name', e.target.value)}
              style={inputStyle}
              className="focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-medium"
            />
          </FieldGroup>
          <FieldGroup label="Age Category" required>
            <select
              value={formData.age_category}
              onChange={e => updateField('age_category', e.target.value)}
              style={inputStyle}
              className="focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-medium"
            >
              {AGE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </FieldGroup>
        </div>

        {/* Ground Type Chips */}
        <FieldGroup label="Ground Type" required>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
            {GROUND_TYPES.map(g => {
              const isSelected = formData.ground_type === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateField('ground_type', g)}
                  style={{
                    padding: '12px 6px', borderRadius: '12px', fontWeight: '800', fontSize: '13px',
                    border: isSelected ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                    backgroundColor: isSelected ? '#15803d' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#111827',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 6px rgba(21,128,61,0.2)' : 'none'
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </FieldGroup>

        <FieldGroup label="Maximum Teams Allowed" required>
          <input
            type="number" min={2} max={62}
            value={formData.max_teams}
            onChange={e => updateField('max_teams', parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, width: '140px' }}
            className="focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-bold"
          />
          <span className="ml-3 text-xs text-zinc-500 font-bold">teams (1–62)</span>
          {errors.max_teams && <p className="mt-1 text-xs font-bold text-red-500">{errors.max_teams}</p>}
        </FieldGroup>
      </Section>

      {/* ── FORMAT SECTION (LOCKABLE) ── */}
      <Section
        title="Tournament Format"
        locked={formatLocked}
        lockMessage={
          formatLocked
            ? `Format details are locked because ${completedCount} of ${totalCount} match(es) in this tournament have already been completed.`
            : null
        }
      >
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px',
          opacity: formatLocked ? 0.55 : 1,
          pointerEvents: formatLocked ? 'none' : 'auto',
        }}>
          {[
            { key: 'league', icon: '🏆', name: 'League', desc: 'Round-robin league' },
            { key: 'knockout', icon: '⚔️', name: 'Knockout', desc: 'Single-elimination' },
            { key: 'league_knockout', icon: '⚽', name: 'League + Knockout', desc: 'Groups then playoff' },
          ].map(opt => {
            const isSelected = formData.tournament_type === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={formatLocked}
                onClick={() => updateField('tournament_type', opt.key)}
                style={{
                  position: 'relative', padding: '16px 12px', borderRadius: '14px', textAlign: 'center',
                  border: isSelected ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                  backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                  cursor: formatLocked ? 'not-allowed' : 'pointer',
                  boxShadow: isSelected ? '0 2px 8px rgba(21,128,61,0.15)' : 'none'
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    backgroundColor: '#15803d', color: '#ffffff',
                    padding: '2px 6px', borderRadius: '10px',
                    fontSize: '8px', fontWeight: '800', textTransform: 'uppercase'
                  }}>
                    Active
                  </div>
                )}
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{opt.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? '#15803d' : '#111827', marginBottom: '3px' }}>
                  {opt.name}
                </div>
                <div style={{ fontSize: '10px', color: isSelected ? '#166534' : '#6b7280', lineHeight: '1.3' }}>
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{
          opacity: formatLocked ? 0.55 : 1,
          pointerEvents: formatLocked ? 'none' : 'auto',
          display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          {/* League Home & Away option */}
          {(formData.tournament_type === 'league' || formData.tournament_type === 'league_knockout') && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.home_and_away}
                  disabled={formatLocked}
                  onChange={e => updateField('home_and_away', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#15803d' }}
                />
                <span className="text-xs font-bold">Home &amp; Away (every pair plays twice)</span>
              </label>
            </div>
          )}

          {/* Knockout settings: Third Place Match */}
          {(formData.tournament_type === 'knockout' || formData.tournament_type === 'league_knockout') && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.third_place_option}
                  disabled={formatLocked}
                  onChange={e => updateField('third_place_option', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#15803d' }}
                />
                <span className="text-xs font-bold">Create Third Place Playoff match (losing semi-finalists play)</span>
              </label>
            </div>
          )}

          {/* League + Knockout sub options */}
          {formData.tournament_type === 'league_knockout' && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="font-extrabold text-xs">League + Knockout Style</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'multi_group', label: 'Multi-Group (World Cup Style)' },
                  { key: 'single_group', label: 'Single Group (Champions League Style)' }
                ].map(styleOpt => {
                  const isSel = formData.league_knockout_style === styleOpt.key;
                  return (
                    <button
                      key={styleOpt.key}
                      type="button"
                      disabled={formatLocked}
                      onClick={() => updateField('league_knockout_style', styleOpt.key)}
                      style={{
                        padding: '10px 8px', borderRadius: '10px', fontWeight: '750', fontSize: '11px',
                        border: isSel ? '2px solid #15803d' : '2px solid #e5e7eb',
                        backgroundColor: isSel ? '#15803d' : '#ffffff',
                        color: isSel ? '#ffffff' : '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      {styleOpt.label}
                    </button>
                  );
                })}
              </div>

              {formData.league_knockout_style === 'multi_group' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px' }}>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5">Number of Groups</label>
                    <input
                      type="number" min={2} max={16}
                      value={formData.num_groups}
                      disabled={formatLocked}
                      onChange={e => updateField('num_groups', parseInt(e.target.value) || 2)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5">Qualifiers per Group</label>
                    <input
                      type="number" min={1} max={8}
                      value={formData.qualifiers_per_group}
                      disabled={formatLocked}
                      onChange={e => updateField('qualifiers_per_group', parseInt(e.target.value) || 1)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {formData.league_knockout_style === 'single_group' && (
                <div style={{ paddingTop: '8px' }}>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5">Teams Qualifying for Knockout</label>
                  <input
                    type="number" min={2} max={formData.max_teams}
                    value={formData.qualifiers_per_group}
                    disabled={formatLocked}
                    onChange={e => updateField('qualifiers_per_group', parseInt(e.target.value) || 2)}
                    style={{ ...inputStyle, width: '120px' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Fixture generation mode */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-extrabold text-xs">Fixture Generation Mode</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { key: 'auto', label: '⚡ Auto-Generate' },
                { key: 'manual', label: '✏️ Manual Entry' }
              ].map(genOpt => {
                const isSel = formData.fixture_generation_mode === genOpt.key;
                return (
                  <button
                    key={genOpt.key}
                    type="button"
                    disabled={formatLocked}
                    onClick={() => updateField('fixture_generation_mode', genOpt.key)}
                    style={{
                      padding: '10px 8px', borderRadius: '10px', fontWeight: '750', fontSize: '11px',
                      border: isSel ? '2px solid #15803d' : '2px solid #e5e7eb',
                      backgroundColor: isSel ? '#15803d' : '#ffffff',
                      color: isSel ? '#ffffff' : '#111827',
                      cursor: 'pointer'
                    }}
                  >
                    {genOpt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Estimated match count */}
        {fixtureEstimate && formData.fixture_generation_mode === 'auto' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-bold text-xs text-green-800 dark:text-green-400">Estimated Match Count</p>
              <p className="text-xl font-black text-green-700 dark:text-green-300 mt-0.5">{fixtureEstimate.total} matches</p>
              <p className="text-[10px] text-green-600/80 dark:text-green-400/80 font-bold">{fixtureEstimate.desc}</p>
            </div>
          </div>
        )}
      </Section>

      {/* ── AWARDS & STATS SECTION ── */}
      <Section title="Awards & Stats Configurations">
        {/* Awards list cards */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--txt)', display: 'block', marginBottom: '8px' }}>
            Individual Awards Config
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {AWARDS_LIST.map(award => {
              const isOn = !!formData.awards_config[award.key]?.enabled;
              return (
                <div
                  key={award.key}
                  style={{
                    borderRadius: '12px',
                    border: isOn ? '2px solid #15803d' : '2px solid #e5e7eb',
                    backgroundColor: isOn ? '#f0fdf4' : '#ffffff',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOn ? '10px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{award.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '750', color: isOn ? '#15803d' : '#111827' }}>
                        {award.name}
                      </span>
                    </div>
                    
                    <ToggleSwitch
                      checked={isOn}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        awards_config: {
                          ...prev.awards_config,
                          [award.key]: {
                            ...prev.awards_config[award.key],
                            enabled: !isOn,
                            per_match: prev.awards_config[award.key]?.per_match || false,
                            overall: prev.awards_config[award.key]?.overall || true,
                          }
                        }
                      }))}
                    />
                  </div>

                  {isOn && (
                    <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '8px', display: 'flex', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#166534', fontWeight: '700', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!formData.awards_config[award.key]?.per_match}
                          onChange={() => setFormData(prev => ({
                            ...prev,
                            awards_config: {
                              ...prev.awards_config,
                              [award.key]: {
                                ...prev.awards_config[award.key],
                                per_match: !prev.awards_config[award.key]?.per_match,
                              }
                            }
                          }))}
                          style={{ width: '13px', height: '13px', accentColor: '#15803d' }}
                        />
                        Per Match
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#166534', fontWeight: '700', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!formData.awards_config[award.key]?.overall}
                          onChange={() => setFormData(prev => ({
                            ...prev,
                            awards_config: {
                              ...prev.awards_config,
                              [award.key]: {
                                ...prev.awards_config[award.key],
                                overall: !prev.awards_config[award.key]?.overall,
                              }
                            }
                          }))}
                          style={{ width: '13px', height: '13px', accentColor: '#15803d' }}
                        />
                        Overall
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Man of Match */}
        {(() => {
          const isMomOn = !!formData.awards_config?.man_of_match;
          return (
            <div style={{
              borderRadius: '12px',
              border: isMomOn ? '2px solid #15803d' : '2px solid #e5e7eb',
              backgroundColor: isMomOn ? '#f0fdf4' : '#ffffff',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🏅</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '750', color: isMomOn ? '#15803d' : '#111827' }}>
                    Man of the Match Selection
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>
                    Allows selecting a match MVP/Man of the Match for every match.
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={isMomOn}
                onChange={() => setFormData(prev => ({
                  ...prev,
                  awards_config: {
                    ...prev.awards_config,
                    man_of_match: !isMomOn
                  }
                }))}
              />
            </div>
          );
        })()}

        {/* Stats track table */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--txt)', display: 'block', marginBottom: '8px' }}>
            Match Stats Configuration
          </label>
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase' }}>Stat</span>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Track</span>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Show</span>
            </div>

            {[
              { key: 'goals',             icon: '⚽', name: 'Goals',             req: true,  note: null },
              { key: 'assists',           icon: '🅰️', name: 'Assists',           req: false, note: null },
              { key: 'goal_contributions',icon: '🎯', name: 'Goal Contributions', req: false, note: 'Auto-calculated' },
              { key: 'yellow_cards',      icon: '🟨', name: 'Yellow Cards',       req: false, note: null },
              { key: 'red_cards',         icon: '🟥', name: 'Red Cards',          req: false, note: null },
              { key: 'clean_sheets',      icon: '🧱', name: 'Clean Sheets',       req: false, note: null }
            ].map((stat, idx, arr) => {
              const isLast = idx === arr.length - 1;
              const tr = stat.req ? true : stat.key === 'goal_contributions' ? false : !!formData.stats_config[stat.key]?.track;
              const sh = !!formData.stats_config[stat.key]?.show;
              const lockTr = stat.req || stat.key === 'goal_contributions';

              const updateS = (f, val) => {
                setFormData(p => ({
                  ...p,
                  stats_config: {
                    ...p.stats_config,
                    [stat.key]: {
                      ...p.stats_config[stat.key],
                      [f]: val
                    }
                  }
                }));
              };

              return (
                <div
                  key={stat.key}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 70px 70px', padding: '10px 12px', alignItems: 'center',
                    borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                    backgroundColor: tr || sh ? '#f9fffe' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {stat.name}
                        {stat.req && (
                          <span style={{ fontSize: '8px', fontWeight: '800', color: '#6b7280', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '0 4px' }}>
                            Required
                          </span>
                        )}
                      </div>
                      {stat.note && <div style={{ fontSize: '9px', color: '#f59e0b', marginTop: '1px' }}>{stat.note}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ToggleSwitch checked={tr} onChange={() => updateS('track', !tr)} disabled={lockTr} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ToggleSwitch checked={sh} onChange={() => updateS('show', !sh)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── ACCESS SETTINGS SECTION ── */}
      <Section title="Access Settings">
        <FieldGroup label="Access Visibility">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {[
              { key: 'open', icon: '🌐', name: 'Open', desc: 'Public stats and scores' },
              { key: 'private', icon: '🔒', name: 'Private', desc: 'Restricted access only' }
            ].map(accessOpt => {
              const isSel = formData.is_private ? accessOpt.key === 'private' : accessOpt.key === 'open';
              return (
                <button
                  key={accessOpt.key}
                  type="button"
                  onClick={() => updateField('is_private', accessOpt.key === 'private')}
                  style={{
                    position: 'relative', padding: '14px 10px', borderRadius: '12px', textAlign: 'left',
                    border: isSel ? '2px solid #15803d' : '2px solid #e5e7eb',
                    backgroundColor: isSel ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>{accessOpt.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: isSel ? '#15803d' : '#111827' }}>{accessOpt.name}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: isSel ? '#166534' : '#6b7280', lineHeight: '1.3' }}>{accessOpt.desc}</div>
                </button>
              );
            })}
          </div>
        </FieldGroup>

        {/* Public stats check */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.public_stats}
              onChange={e => updateField('public_stats', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#15803d' }}
            />
            <div>
              <span className="text-xs font-bold block">Make stats publicly visible</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Allow public viewers to see scores, fixtures, and leaderboards</span>
            </div>
          </label>
        </div>

        {/* Age verification settings if not Open/Veterans */}
        {!['Open', 'Veterans'].includes(formData.age_category) && (
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-extrabold text-xs">Player Age Verification</h4>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.age_verification_required}
                onChange={e => updateField('age_verification_required', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#15803d' }}
              />
              <span className="text-xs font-bold">Require document-level age verification</span>
            </label>

            {formData.age_verification_required && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px', paddingTop: '6px' }}>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Accepted Document Formats (select at least one):</p>
                {[
                  { field: 'accept_aadhaar', label: 'Accept Aadhaar card' },
                  { field: 'accept_school_certificate', label: 'Accept school certificate' },
                  { field: 'accept_birth_certificate', label: 'Accept birth certificate' }
                ].map(doc => (
                  <label key={doc.field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData[doc.field]}
                      onChange={e => updateField(doc.field, e.target.checked)}
                      style={{ width: '14px', height: '14px', accentColor: '#15803d' }}
                    />
                    <span className="text-xs font-semibold">{doc.label}</span>
                  </label>
                ))}
                {errors.age_verification && <p className="text-xs font-bold text-red-500">{errors.age_verification}</p>}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── STICKY BOTTOM SAVE/CANCEL BAR ── */}
      <div style={{
        position: 'sticky', bottom: '16px', marginTop: '28px',
        display: 'flex', justifyContent: 'flex-end', gap: '12px',
        backgroundColor: '#ffffff', padding: '12px 18px', borderRadius: '16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
        zIndex: 50
      }}>
        <button
          type="button"
          onClick={() => navigate(`/organiser/tournament/${id}/manage`)}
          style={{
            padding: '10px 20px', borderRadius: '10px',
            border: '2px solid #d1d5db', backgroundColor: '#ffffff',
            color: '#374151', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none',
            backgroundColor: '#15803d', color: '#ffffff',
            fontWeight: '800', fontSize: '13px',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: '0 2px 6px rgba(21,128,61,0.25)'
          }}
        >
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>

      {/* Toast popup */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: '#ffffff', padding: '12px 24px', borderRadius: '14px',
          fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px'
        }} className="animate-fade-in">
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

// ── Reusable Section Box with Format Lock alert support ──
const Section = ({ title, children, locked, lockMessage }) => (
  <div style={{
    backgroundColor: '#ffffff', border: '1.5px solid #e5e7eb',
    borderRadius: '16px', padding: '20px', marginBottom: '18px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>{title}</h2>
      {locked && (
        <span style={{
          fontSize: '10px', fontWeight: '800', color: '#b45309',
          backgroundColor: '#fef3c7', border: '1px solid #fcd34d',
          padding: '2px 8px', borderRadius: '20px',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          <Lock size={10} /> Locked
        </span>
      )}
    </div>
    {lockMessage && (
      <div style={{
        backgroundColor: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: '12px', padding: '12px 14px', fontSize: '12px',
        color: '#b45309', marginBottom: '16px', lineHeight: '1.4',
        fontWeight: '600'
      }}>
        ⚠️ {lockMessage}
      </div>
    )}
    {children}
  </div>
);

const FieldGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid #e5e7eb', fontSize: '13px', color: '#111827',
  outline: 'none', backgroundColor: '#ffffff',
};

export default EditTournament;
