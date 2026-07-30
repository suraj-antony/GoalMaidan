import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { ChevronRight, ChevronLeft, Check, Lock, Info, Shield, Zap, PenLine } from 'lucide-react';

const STEPS = [
  'Basic Info',
  'Format & Teams',
  'Fixture Setup',
  'Verification',
  'Awards & Stats',
  'Review',
];

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

const STATS_LIST = [
  { key: 'goals',              name: 'Goals',               icon: '⚽', locked: true },
  { key: 'assists',            name: 'Assists',             icon: '🅰️', locked: false },
  { key: 'goal_contributions', name: 'Goal Contributions',  icon: '📈', locked: false, note: 'Automatically calculated from Goals + Assists.', showOnly: true },
  { key: 'yellow_cards',       name: 'Yellow Cards',        icon: '🟨', locked: false },
  { key: 'red_cards',          name: 'Red Cards',           icon: '🟥', locked: false },
  { key: 'clean_sheets',       name: 'Clean Sheets',        icon: '🧱', locked: false },
  { key: 'saves',              name: 'Saves',               icon: '🧤', locked: false },
  { key: 'man_of_the_match',   name: 'Man of the Match',    icon: '🏅', locked: false },
];

// ── helpers ──────────────────────────────────────────────────────────────────

/** Compute total league fixtures for N teams (single round-robin by default) */
function leagueMatchCount(n, homeAndAway = false) {
  const pairs = (n * (n - 1)) / 2;
  return homeAndAway ? pairs * 2 : pairs;
}

/** Rounds in a single-elimination bracket for N teams */
function knockoutRounds(n) {
  return Math.ceil(Math.log2(n));
}

/** Total fixtures in a single-elimination bracket (power-of-2 padded) */
function knockoutMatchCount(n) {
  if (n < 2) return 0;
  const pow2 = Math.pow(2, Math.ceil(Math.log2(n)));
  return pow2 - 1;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CreateTournament() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    area_name: '',
    ground_type: '',
    age_category: '',
    tournament_type: '',
    home_and_away: false,
    third_place_option: false,
    knockout_qualifiers: 4,
    max_teams: 8,

    team_names: [],              // array of strings
    fixture_generation_mode: 'auto',
    league_knockout_style: 'single_group',
    num_groups: 4,
    qualifiers_per_group: 2,
    age_verification_required: false,
    accept_aadhaar: false,
    accept_school_certificate: false,
    accept_birth_certificate: false,
    is_private: false,
    public_stats: true,
    awards_config: {
      man_of_match: true,
      top_scorer:      { enabled: true,  per_match: false, overall: true },
      best_gk:         { enabled: true,  per_match: false, overall: true },
      best_defender:   { enabled: false, per_match: false, overall: false },
      best_midfielder: { enabled: false, per_match: false, overall: false },
      best_player:     { enabled: true,  per_match: false, overall: true },
      best_team:       { enabled: false, per_match: false, overall: false },
      emerging_player: { enabled: false, per_match: false, overall: false },
      fair_play:       { enabled: false, per_match: false, overall: false },
    },
    stats_config: {
      goals:              { track: true,  show: true },
      assists:            { track: true,  show: true },
      goal_contributions: { track: false, show: true },
      yellow_cards:       { track: true,  show: false },
      red_cards:          { track: true,  show: false },
      clean_sheets:       { track: false, show: false },
      saves:              { track: false, show: false },
      man_of_the_match:   { track: true,  show: true },
    },
  });

  useEffect(() => {
    if (!id) return;
    const fetchTournament = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tournaments/${id}/`);
        const data = res.data;
        
        // Map the loaded awards_config and stats_config with sensible fallbacks
        const loadedAwards = data.awards_config || {};
        const loadedStats = data.stats_config || {};

        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          area_name: data.area_name || '',
          ground_type: data.ground_type || '',
          age_category: data.age_category || '',
          tournament_type: data.tournament_type || '',
          home_and_away: !!data.home_and_away,
          third_place_option: !!data.third_place_option,
          knockout_qualifiers: data.knockout_qualifiers ?? 4,
          max_teams: data.max_teams ?? 8,
          team_names: data.team_names_list || [],
          fixture_generation_mode: data.fixture_generation_mode || 'auto',
          league_knockout_style: data.league_knockout_style || 'single_group',
          num_groups: data.num_groups ?? 4,
          qualifiers_per_group: data.qualifiers_per_group ?? 2,
          age_verification_required: !!data.age_verification_required,
          accept_aadhaar: !!data.accept_aadhaar,
          accept_school_certificate: !!data.accept_school_certificate,
          accept_birth_certificate: !!data.accept_birth_certificate,
          is_private: !!data.is_private,
          public_stats: !!data.public_stats,
          awards_config: {
            ...prev.awards_config,
            ...loadedAwards,
          },
          stats_config: {
            ...prev.stats_config,
            ...loadedStats,
          },
        }));
      } catch (err) {
        console.error('Failed to load tournament:', err);
        setError('Failed to load tournament details.');
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [id]);

  // ── computed fixture estimate ─────────────────────────────────────────────

  const fixtureEstimate = useMemo(() => {
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
      const r = knockoutRounds(n);
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
  }, [formData.max_teams, formData.home_and_away, formData.tournament_type,
      formData.league_knockout_style, formData.num_groups, formData.qualifiers_per_group]);

  // ── state helpers ─────────────────────────────────────────────────────────

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
      // When max_teams changes, resize the team_names array
      if (field === 'max_teams') {
        const newCount = parseInt(value) || 1;
        const names = [...(prev.team_names || [])];
        while (names.length < newCount) names.push('');
        return { ...prev, max_teams: newCount, team_names: names.slice(0, newCount) };
      }
      return { ...prev, [field]: value };
    });
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const updateTeamName = (idx, value) => {
    setFormData(prev => {
      const names = [...(prev.team_names || [])];
      names[idx] = value;
      return { ...prev, team_names: names };
    });
  };

  const updateAwardConfig = (key, changes) => {
    setFormData(prev => ({
      ...prev,
      awards_config: {
        ...prev.awards_config,
        [key]: { ...prev.awards_config[key], ...changes },
      },
    }));
  };

  const updateStatsConfig = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      stats_config: {
        ...prev.stats_config,
        [key]: { ...prev.stats_config[key], [field]: value },
      },
    }));
  };

  // ── validation ────────────────────────────────────────────────────────────

  const validateStep = (currentStep) => {
    setError(null);
    const errors = {};

    if (currentStep === 0) {
      if (!formData.name.trim()) errors.name = 'Tournament name is required';
      if (!formData.ground_type)  errors.ground_type = 'Ground type is required';
      if (!formData.age_category) errors.age_category = 'Age category is required';
    }

    if (currentStep === 1) {
      if (!formData.tournament_type) errors.tournament_type = 'Tournament type is required';
      const mt = parseInt(formData.max_teams);
      if (!mt || mt < 1 || mt > 62) errors.max_teams = 'Max teams must be between 1 and 62';
    }

    if (currentStep === 2) {
      // Fixture Setup — nothing mandatory; sensible defaults already set
    }

    if (currentStep === 3) {
      if (formData.age_verification_required) {
        if (!formData.accept_aadhaar && !formData.accept_school_certificate && !formData.accept_birth_certificate) {
          errors.age_verification = 'At least one document type must be accepted if age verification is required';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    } else {
      setError('Please resolve all validation errors before proceeding.');
    }
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    setStep(s => s - 1);
  };

  const handleCreate = async () => {
    if (!validateStep(step)) {
      setError('Please resolve all validation errors.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    // Build payload — map team_names → team_names_list
    const payload = {
      ...formData,
      team_names_list: formData.team_names.filter(n => n.trim()),
    };
    delete payload.team_names;

    try {
      if (isEdit) {
        await api.put(`/tournaments/${id}/`, payload);
        navigate(`/dashboard`);
      } else {
        const response = await api.post('/tournaments/', payload);
        navigate(`/organiser/tournament/${response.data.id}`);
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object' && errorData !== null) {
        setFieldErrors(errorData);
        setError('Please fix the errors above.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── shared CSS helpers ────────────────────────────────────────────────────

  const SelectionCard = ({ isSelected, onClick, icon, name, desc }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        textAlign: 'left',
        padding: '16px',
        borderRadius: '14px',
        border: isSelected ? '2.5px solid #15803d' : '2px solid #e5e7eb',
        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(21,128,61,0.12), 0 2px 8px rgba(21,128,61,0.15)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        width: '100%',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#86efac';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }
      }}
    >
      {/* ✅ Checkmark badge + Active label top-right when selected */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#15803d',
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: '800',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="#ffffff" strokeWidth="3"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>Active</span>
        </div>
      )}

      {/* Icon */}
      <div style={{ fontSize: '26px', marginBottom: '8px' }}>{icon}</div>

      {/* Name */}
      <div style={{
        fontSize: '14px',
        fontWeight: '700',
        color: isSelected ? '#15803d' : '#111827',
        marginBottom: '5px',
        paddingRight: isSelected ? '28px' : '0',
      }}>
        {name}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '12px',
        color: isSelected ? '#166534' : '#6b7280',
        lineHeight: '1.5',
      }}>
        {desc}
      </div>

      {/* Green bottom bar when selected */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: '#15803d',
          borderRadius: '0 0 12px 12px',
        }} />
      )}
    </button>
  );

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
        backgroundColor: disabled
          ? '#d1d5db'
          : checked
          ? '#15803d'
          : '#d1d5db',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
        padding: 0,
        opacity: disabled ? 0.6 : 1,
      }}
      title={disabled ? 'This stat is always required' : ''}
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

  const inputCls = (hasError) =>
    `w-full px-4 py-3 rounded-xl border bg-[var(--bg)] text-[var(--txt)] focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-medium placeholder-zinc-400 ${hasError ? 'border-red-500 ring-1 ring-red-100' : 'border-[var(--border)]'}`;

  const cardCls = (selected) =>
    selected
      ? 'p-5 rounded-2xl border-2 text-left transition-all flex flex-col h-full shadow-sm hover:scale-[1.01] cursor-pointer border-green-600 bg-green-50 dark:border-green-700 dark:bg-green-950/20'
      : 'p-5 rounded-2xl border-2 text-left transition-all flex flex-col h-full shadow-sm hover:scale-[1.01] cursor-pointer border-[var(--border)] bg-[var(--bg)] hover:border-zinc-300 dark:hover:border-zinc-600';

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--txt)]">
          {isEdit ? 'Edit' : 'Create'} <span className="text-green-700 dark:text-green-400">Tournament</span>
        </h1>
        <p className="text-[var(--txt2)] mt-2 max-w-md mx-auto">
          {isEdit
            ? 'Update the details, format, verification rules, stats, and configurations of your tournament.'
            : 'Set up a new football league, knockout, or mixed format tournament in minutes.'}
        </p>
      </div>

      {/* ── Professional Step Progress Bar ── */}
      {(() => {
        const currentStep = step + 1;
        const steps = [
          { number: 1, label: 'Basic Info' },
          { number: 2, label: 'Format & Teams' },
          { number: 3, label: 'Fixture Setup' },
          { number: 4, label: 'Verification' },
          { number: 5, label: 'Awards & Stats' },
          { number: 6, label: 'Review' },
        ];

        return (
          <div style={{
            padding: '24px 0 20px',
            marginBottom: '8px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              position: 'relative',
            }}>

              {/* Connecting line behind steps */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: '#e5e7eb',
                zIndex: 0,
              }} />

              {/* Green progress fill */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '0',
                height: '2px',
                backgroundColor: '#15803d',
                zIndex: 1,
                transition: 'width 0.4s ease',
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }} />

              {steps.map((stepItem) => {
                const isCompleted = currentStep > stepItem.number;
                const isCurrent   = currentStep === stepItem.number;
                const isUpcoming  = currentStep < stepItem.number;

                return (
                  <div
                    key={stepItem.number}
                    onClick={() => {
                      if (stepItem.number - 1 < step) {
                        setStep(stepItem.number - 1);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 2,
                      flex: 1,
                      cursor: stepItem.number - 1 < step ? 'pointer' : 'default',
                    }}
                  >

                    {/* Circle */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      border: isCompleted
                        ? '2px solid #15803d'
                        : isCurrent
                        ? '2.5px solid #15803d'
                        : '2px solid #d1d5db',
                      backgroundColor: isCompleted
                        ? '#15803d'
                        : isCurrent
                        ? '#ffffff'
                        : '#f9fafb',
                      color: isCompleted
                        ? '#ffffff'
                        : isCurrent
                        ? '#15803d'
                        : '#9ca3af',
                      boxShadow: isCurrent
                        ? '0 0 0 4px rgba(21,128,61,0.15)'
                        : 'none',
                    }}>
                      {isCompleted ? (
                        /* White tick for completed steps */
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                             stroke="#ffffff" strokeWidth="3"
                             strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        stepItem.number
                      )}
                    </div>

                    {/* Step label */}
                    <div style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      fontWeight: isCurrent ? '700' : '500',
                      color: isCompleted
                        ? '#15803d'
                        : isCurrent
                        ? '#111827'
                        : '#9ca3af',
                      textAlign: 'center',
                      lineHeight: '1.3',
                      maxWidth: '70px',
                      transition: 'color 0.3s ease',
                    }}>
                      {stepItem.label}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Form Container */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-md p-6 sm:p-8 transition-all">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1 — BASIC INFO
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-[var(--txt)] border-b border-[var(--border)] pb-2 mb-4">
              Basic Information
            </h2>

            {/* Tournament Name */}
            <div>
              <label className="block text-sm font-bold text-[var(--txt)] mb-2">
                Tournament Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputCls(fieldErrors.name)}
                placeholder="e.g. Nagapattinam 7s Open 2026"
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
              />
              {fieldErrors.name && <p className="mt-1.5 text-xs font-bold text-red-500">{fieldErrors.name}</p>}
            </div>

            {/* Ground Type */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '8px',
              }}>
                Ground Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '10px',
              }}>
                {GROUND_TYPES.map(g => {
                  const isSelected = formData.ground_type === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateField('ground_type', g)}
                      style={{
                        position: 'relative',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '14px',
                        border: isSelected ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? '#15803d' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#111827',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(21,128,61,0.15), 0 2px 6px rgba(21,128,61,0.25)'
                          : '0 1px 3px rgba(0,0,0,0.05)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#86efac';
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }
                      }}
                    >
                      <span>{g}</span>
                      {isSelected && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#ffffff',
                          opacity: 0.9,
                        }}>
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.ground_type && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>
                  {fieldErrors.ground_type}
                </p>
              )}
            </div>

            {/* Age Category */}
            <div>
              <label className="block text-sm font-bold text-[var(--txt)] mb-2">
                Age Category <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls(fieldErrors.age_category)}
                value={formData.age_category}
                onChange={e => updateField('age_category', e.target.value)}
              >
                <option value="" disabled>Select Age Category</option>
                {AGE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {fieldErrors.age_category && <p className="mt-1.5 text-xs font-bold text-red-500">{fieldErrors.age_category}</p>}
            </div>

            {/* Organising Area */}
            <div>
              <label className="block text-sm font-bold text-[var(--txt)] mb-2">Organising Team Name</label>
              <input
                type="text"
                className={inputCls(false)}
                placeholder="e.g. GoalMaidan Organising Team"
                value={formData.area_name}
                onChange={e => updateField('area_name', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2 — FORMAT & TEAMS
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-[var(--txt)] border-b border-[var(--border)] pb-2 mb-4">
              Tournament Format &amp; Teams
            </h2>

            {/* Tournament Type */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '12px',
              }}>
                Tournament Type <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                {[
                  {
                    key: 'league',
                    icon: '🏆',
                    name: 'League',
                    desc: 'Every team plays every other team. Winner tops the table. (e.g. La Liga, Premier League)',
                  },
                  {
                    key: 'knockout',
                    icon: '⚔️',
                    name: 'Knockout',
                    desc: "Single elimination. Lose once and you're out. (e.g. FA Cup)",
                  },
                  {
                    key: 'league_knockout',
                    icon: '⚽',
                    name: 'League + Knockout',
                    desc: 'Group league phase first, then top teams play knockout rounds. (e.g. World Cup, Champions League)',
                  },
                ].map((type) => {
                  const isSelected = formData.tournament_type === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => updateField('tournament_type', type.key)}
                      style={{
                        position: 'relative',
                        textAlign: 'left',
                        padding: '16px',
                        borderRadius: '14px',
                        border: isSelected ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(21,128,61,0.12), 0 2px 8px rgba(21,128,61,0.15)'
                          : '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#86efac';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                        }
                      }}
                    >
                      {/* ✅ Selected checkmark badge + Active label — top right corner */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#15803d',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                               stroke="#ffffff" strokeWidth="3"
                               strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>Active</span>
                        </div>
                      )}

                      {/* Icon */}
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                        {type.icon}
                      </div>

                      {/* Name */}
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: isSelected ? '#15803d' : '#111827',
                        marginBottom: '6px',
                      }}>
                        {type.name}
                      </div>

                      {/* Description */}
                      <div style={{
                        fontSize: '12px',
                        color: isSelected ? '#166534' : '#6b7280',
                        lineHeight: '1.5',
                      }}>
                        {type.desc}
                      </div>

                      {/* Bottom green bar when selected */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          height: '3px',
                          backgroundColor: '#15803d',
                          borderRadius: '0 0 12px 12px',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {fieldErrors.tournament_type && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>
                  {fieldErrors.tournament_type}
                </p>
              )}
            </div>

            {/* League Sub-options */}
            {(formData.tournament_type === 'league' || formData.tournament_type === 'league_knockout') && (
              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-[var(--border)] space-y-4">
                <h4 className="font-bold text-sm text-[var(--txt)]">League Settings</h4>
                {/* Home & Away toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.home_and_away}
                      onChange={e => updateField('home_and_away', e.target.checked)}
                    />
                    <div 
                      className="w-10 h-6 rounded-full transition-all duration-200" 
                      style={{ backgroundColor: formData.home_and_away ? '#16a34a' : '#d4d4d8' }}
                    />
                    <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-all duration-200 ${formData.home_and_away ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--txt)]">Home &amp; Away (play each other twice)</span>
                </label>
              </div>
            )}

            {/* Knockout Sub-options */}
            {(formData.tournament_type === 'knockout' || formData.tournament_type === 'league_knockout') && (
              <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 ${
                formData.third_place_option 
                  ? 'bg-green-50/10 border-green-200 dark:border-green-900/60' 
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-[var(--border)]'
              }`}>
                <h4 className="font-bold text-sm text-[var(--txt)] flex items-center justify-between">
                  <span>Knockout Settings</span>
                  {formData.third_place_option && (
                    <span className="text-[10px] font-black bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900/60 px-2 py-0.5 rounded-full uppercase tracking-wider animate-fade-in">
                      Enabled
                    </span>
                  )}
                </h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.third_place_option}
                      onChange={e => updateField('third_place_option', e.target.checked)}
                    />
                    <div 
                      className="w-10 h-6 rounded-full transition-all duration-200" 
                      style={{ backgroundColor: formData.third_place_option ? '#16a34a' : '#d4d4d8' }}
                    />
                    <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-all duration-200 ${formData.third_place_option ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--txt)]">Create Third Place Playoff match (losers of Semi Finals play for 3rd/4th)</span>
                </label>
              </div>
            )}


            {/* Max Teams */}
            <div>
              <label className="block text-sm font-bold text-[var(--txt)] mb-2">
                Maximum Teams Allowed <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={62}
                className={`w-40 px-4 py-3 rounded-xl border bg-[var(--bg)] text-[var(--txt)] focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-semibold ${fieldErrors.max_teams ? 'border-red-500' : 'border-[var(--border)]'}`}
                value={formData.max_teams}
                onChange={e => updateField('max_teams', parseInt(e.target.value) || 1)}
              />
              <span className="ml-3 text-sm text-[var(--txt2)]">teams (1–62)</span>
              {fieldErrors.max_teams && <p className="mt-1.5 text-xs font-bold text-red-500">{fieldErrors.max_teams}</p>}
            </div>

            {/* Team Names */}
            {formData.max_teams >= 1 && (
              <div>
                <label className="block text-sm font-bold text-[var(--txt)] mb-1">
                  Team Names <span className="text-xs font-medium text-[var(--txt2)]">(optional — you can add them later)</span>
                </label>
                <p className="text-xs text-[var(--txt2)] mb-3">Enter names for each participating team. Leave blank for any team you don't know yet.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                  {Array.from({ length: formData.max_teams }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--txt2)] w-6 shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm font-medium placeholder-zinc-400 focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all"
                        placeholder={`Team ${idx + 1}`}
                        value={formData.team_names[idx] || ''}
                        onChange={e => updateTeamName(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3 — FIXTURE SETUP (NEW)
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-[var(--txt)] border-b border-[var(--border)] pb-2 mb-4">
              Fixture Setup
            </h2>

            {/* League + Knockout style selector */}
            {formData.tournament_type === 'league_knockout' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '10px',
                }}>
                  League + Knockout Style <span style={{ color: '#ef4444' }}>*</span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <SelectionCard
                    isSelected={formData.league_knockout_style === 'multi_group'}
                    onClick={() => updateField('league_knockout_style', 'multi_group')}
                    icon="🌍"
                    name="Multi-Group (World Cup style)"
                    desc="Teams split into multiple groups. Top teams from each group advance to knockout."
                  />
                  <SelectionCard
                    isSelected={formData.league_knockout_style === 'single_group'}
                    onClick={() => updateField('league_knockout_style', 'single_group')}
                    icon="🏟️"
                    name="Single Group (Champions League style)"
                    desc="All teams in one league group. Top N teams qualify for knockout."
                  />
                </div>

                {/* Multi-group controls */}
                {formData.league_knockout_style === 'multi_group' && (
                  <div className="mt-4 p-5 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-[var(--border)] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--txt)] mb-1.5">Number of Groups</label>
                        <input
                          type="number"
                          min={2}
                          max={16}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm font-bold focus:border-green-600 focus:ring-green-600"
                          value={formData.num_groups}
                          onChange={e => updateField('num_groups', parseInt(e.target.value) || 2)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--txt)] mb-1.5">Teams Qualifying per Group</label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm font-bold focus:border-green-600 focus:ring-green-600"
                          value={formData.qualifiers_per_group}
                          onChange={e => updateField('qualifiers_per_group', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Single-group qualifiers */}
                {formData.league_knockout_style === 'single_group' && (
                  <div className="mt-4 p-5 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-[var(--border)]">
                    <label className="block text-xs font-bold text-[var(--txt)] mb-1.5">
                      Teams qualifying for knockout
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={formData.max_teams}
                      className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] text-sm font-bold focus:border-green-600 focus:ring-green-600"
                      value={formData.qualifiers_per_group}
                      onChange={e => updateField('qualifiers_per_group', parseInt(e.target.value) || 2)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Auto vs Manual fixture generation */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '10px',
              }}>
                Fixture Generation Mode <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SelectionCard
                  isSelected={formData.fixture_generation_mode === 'auto'}
                  onClick={() => updateField('fixture_generation_mode', 'auto')}
                  icon="⚡"
                  name="Auto Generate"
                  desc="System automatically schedules all fixtures using the round-robin algorithm."
                />
                <SelectionCard
                  isSelected={formData.fixture_generation_mode === 'manual'}
                  onClick={() => updateField('fixture_generation_mode', 'manual')}
                  icon="✏️"
                  name="Manual Entry"
                  desc="You will enter fixtures manually after the tournament is created — useful when you already have a schedule."
                />
              </div>
            </div>

            {/* Estimated match count card */}
            {fixtureEstimate && formData.fixture_generation_mode === 'auto' && (
              <div className="p-5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-2xl flex items-start gap-4">
                <span className="text-3xl">📋</span>
                <div>
                  <p className="font-extrabold text-green-800 dark:text-green-400 text-sm">Estimated Fixtures</p>
                  <p className="text-2xl font-black text-green-700 dark:text-green-300 mt-0.5">{fixtureEstimate.total} matches</p>
                  <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-1">{fixtureEstimate.desc}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4 — AGE VERIFICATION & ACCESS
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-[var(--txt)] border-b border-[var(--border)] pb-2 mb-4">
              Age Verification &amp; Access Settings
            </h2>

            {!['Open', 'Veterans'].includes(formData.age_category) ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Shield size={20} />
                  <h3 className="font-bold text-sm">Age Verification Options</h3>
                </div>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded text-green-600 focus:ring-green-600"
                    checked={formData.age_verification_required}
                    onChange={e => updateField('age_verification_required', e.target.checked)}
                  />
                  <span className="text-sm font-bold text-[var(--txt)]">Require age verification for players</span>
                </label>
                {formData.age_verification_required && (
                  <div className="pl-8 space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--txt2)] mb-2">Accepted Documents (select at least one):</p>
                    {[
                      { field: 'accept_aadhaar',            label: 'Accept Aadhaar card' },
                      { field: 'accept_school_certificate', label: 'Accept school certificate' },
                      { field: 'accept_birth_certificate',  label: 'Accept birth certificate' },
                    ].map(doc => (
                      <label key={doc.field} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-green-600 focus:ring-green-600"
                          checked={formData[doc.field]}
                          onChange={e => updateField(doc.field, e.target.checked)}
                        />
                        <span className="text-sm font-semibold text-[var(--txt)]">{doc.label}</span>
                      </label>
                    ))}
                    {fieldErrors.age_verification && (
                      <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.age_verification}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50 rounded-xl flex items-start gap-3">
                <Info size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">No age verification needed</p>
                  <p className="text-xs mt-0.5">Open and Veterans categories do not require document-level age verification.</p>
                </div>
              </div>
            )}

            {/* Access Type */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '10px',
              }}>
                Access Type
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                {/* OPEN card */}
                {[
                  {
                    key: 'open',
                    icon: '🌐',
                    name: 'Open',
                    desc: 'Anyone can view tournament stats, scores, and fixtures.',
                  },
                  {
                    key: 'private',
                    icon: '🔒',
                    name: 'Private',
                    desc: 'Viewers must request access to see tournament details.',
                  },
                ].map((opt) => {
                  const isSelected = formData.is_private
                    ? opt.key === 'private'
                    : opt.key === 'open';

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        updateField('is_private', opt.key === 'private')
                      }
                      style={{
                        position: 'relative',
                        textAlign: 'left',
                        padding: '16px',
                        borderRadius: '14px',
                        border: isSelected ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(21,128,61,0.12), 0 2px 8px rgba(21,128,61,0.15)'
                          : '0 1px 3px rgba(0,0,0,0.06)',
                        width: '100%',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#86efac';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                        }
                      }}
                    >
                      {/* Checkmark badge + Active label */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#15803d',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                               stroke="#ffffff" strokeWidth="3"
                               strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>Active</span>
                        </div>
                      )}

                      {/* Icon */}
                      <div style={{ fontSize: '26px', marginBottom: '8px' }}>{opt.icon}</div>

                      {/* Name */}
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: isSelected ? '#15803d' : '#111827',
                        marginBottom: '5px',
                        paddingRight: '28px',
                      }}>
                        {opt.name}
                      </div>

                      {/* Description */}
                      <div style={{
                        fontSize: '12px',
                        color: isSelected ? '#166534' : '#6b7280',
                        lineHeight: '1.5',
                      }}>
                        {opt.desc}
                      </div>

                      {/* Bottom green bar */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0, left: 0, right: 0,
                          height: '3px',
                          backgroundColor: '#15803d',
                          borderRadius: '0 0 12px 12px',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Public Stats */}
            <label className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded text-green-600 focus:ring-green-600"
                checked={formData.public_stats}
                onChange={e => updateField('public_stats', e.target.checked)}
              />
              <div>
                <span className="text-sm font-bold text-[var(--txt)] block">Make stats publicly visible</span>
                <span className="text-xs text-[var(--txt2)] font-medium mt-0.5 block">Show scores, fixtures, and leaderboards to the public</span>
              </div>
            </label>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 5 — AWARDS & STATS
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-8">
            <h2 className="text-xl font-extrabold text-[var(--txt)] border-b border-[var(--border)] pb-2 mb-2">
              Awards &amp; Stats Settings
            </h2>

            {/* Awards Cards */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                Choose which individual awards you want to give in this tournament
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                You can skip any awards you don't want to give.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'top_scorer',      icon: '⚽', name: 'Top Scorer' },
                  { key: 'best_gk',         icon: '🧤', name: 'Best Goalkeeper' },
                  { key: 'best_defender',   icon: '🛡️',  name: 'Best Defender' },
                  { key: 'best_midfielder', icon: '🎯', name: 'Best Midfielder' },
                  { key: 'best_player',     icon: '🌟', name: 'Best Player (Overall)' },
                  { key: 'best_team',       icon: '🏅', name: 'Best Team' },
                  { key: 'emerging_player', icon: '⭐', name: 'Emerging Player' },
                  { key: 'fair_play',       icon: '🤝', name: 'Fair Play Award' },
                ].map((award) => {
                  const isOn = !!formData.awards_config[award.key]?.enabled;

                  return (
                    <div
                      key={award.key}
                      style={{
                        borderRadius: '14px',
                        border: isOn ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                        backgroundColor: isOn ? '#f0fdf4' : '#ffffff',
                        padding: '14px',
                        transition: 'all 0.2s ease',
                        boxShadow: isOn
                          ? '0 0 0 3px rgba(21,128,61,0.10), 0 2px 8px rgba(21,128,61,0.12)'
                          : '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Top row: icon + name + toggle — ALWAYS VISIBLE */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: isOn ? '10px' : '0',
                      }}>
                        {/* Left: icon + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px', flexShrink: 0 }}>{award.icon}</span>
                          {/* NAME — always rendered, never conditional */}
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: isOn ? '#15803d' : '#111827',
                            whiteSpace: 'nowrap',
                          }}>
                            {award.name}
                          </span>
                        </div>

                        {/* Toggle switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              awards_config: {
                                ...prev.awards_config,
                                [award.key]: {
                                  ...prev.awards_config[award.key],
                                  enabled: !isOn,
                                  per_match: prev.awards_config[award.key]?.per_match || false,
                                  overall: prev.awards_config[award.key]?.overall || true,
                                },
                              },
                            }));
                          }}
                          style={{
                            position: 'relative',
                            width: '44px',
                            height: '24px',
                            borderRadius: '12px',
                            backgroundColor: isOn ? '#15803d' : '#d1d5db',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            flexShrink: 0,
                            padding: 0,
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '3px',
                            left: isOn ? '23px' : '3px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            transition: 'left 0.2s ease',
                            display: 'block',
                          }} />
                        </button>
                      </div>

                      {/* Expanded options — only when ON */}
                      {isOn && (
                        <div style={{
                          borderTop: '1px solid #bbf7d0',
                          paddingTop: '10px',
                          display: 'flex',
                          gap: '16px',
                        }}>
                          {/* Per Match checkbox */}
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#166534',
                            fontWeight: '500',
                          }}>
                            <input
                              type="checkbox"
                              checked={!!formData.awards_config[award.key]?.per_match}
                              onChange={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  awards_config: {
                                    ...prev.awards_config,
                                    [award.key]: {
                                      ...prev.awards_config[award.key],
                                      per_match: !prev.awards_config[award.key]?.per_match,
                                    },
                                  },
                                }));
                              }}
                              style={{
                                width: '15px',
                                height: '15px',
                                accentColor: '#15803d',
                                cursor: 'pointer',
                              }}
                            />
                            Per Match
                          </label>

                          {/* Overall Tournament checkbox */}
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#166534',
                            fontWeight: '500',
                          }}>
                            <input
                              type="checkbox"
                              checked={!!formData.awards_config[award.key]?.overall}
                              onChange={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  awards_config: {
                                    ...prev.awards_config,
                                    [award.key]: {
                                      ...prev.awards_config[award.key],
                                      overall: !prev.awards_config[award.key]?.overall,
                                    },
                                  },
                                }));
                              }}
                              style={{
                                width: '15px',
                                height: '15px',
                                accentColor: '#15803d',
                                cursor: 'pointer',
                              }}
                            />
                            Overall Tournament
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Man of the Match — separate card */}
            {(() => {
              const isOn = !!formData.awards_config?.man_of_match;
              return (
                <div style={{
                  borderRadius: '14px',
                  border: isOn ? '2.5px solid #15803d' : '2px solid #e5e7eb',
                  backgroundColor: isOn ? '#f0fdf4' : '#ffffff',
                  padding: '14px 16px',
                  marginBottom: '24px',
                  transition: 'all 0.2s ease',
                  boxShadow: isOn
                    ? '0 0 0 3px rgba(21,128,61,0.10)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>🏅</span>
                      <div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: isOn ? '#15803d' : '#111827',
                        }}>
                          Man of the Match
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          Enable Man of the Match selection for every single match
                        </div>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        awards_config: {
                          ...prev.awards_config,
                          man_of_match: !isOn,
                        },
                      }))}
                      style={{
                        position: 'relative',
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: isOn ? '#15803d' : '#d1d5db',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: isOn ? '23px' : '3px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        transition: 'left 0.2s ease',
                        display: 'block',
                      }} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Stats Track & Show Table */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                Match Stats to Track & Show
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                Choose which stats the organiser can enter and which viewers can see.
              </p>

              <div style={{
                border: '1.5px solid #e5e7eb',
                borderRadius: '14px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
              }}>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px',
                  padding: '10px 16px',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Stat
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Track
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Show
                  </span>
                </div>

                {/* Stat rows */}
                {[
                  { key: 'goals',             icon: '⚽', name: 'Goals',             required: true,  trackNote: null },
                  { key: 'assists',           icon: '🅰️', name: 'Assists',           required: false, trackNote: null },
                  { key: 'goal_contributions',icon: '🎯', name: 'Goal Contributions', required: false, trackNote: 'Auto-calculated from Goals + Assists' },
                  { key: 'yellow_cards',      icon: '🟨', name: 'Yellow Cards',       required: false, trackNote: null },
                  { key: 'red_cards',         icon: '🟥', name: 'Red Cards',          required: false, trackNote: null },
                  { key: 'clean_sheets',      icon: '🧱', name: 'Clean Sheets',       required: false, trackNote: null },
                  { key: 'saves',             icon: '🧤', name: 'Saves',              required: false, trackNote: null },
                ].map((stat, index, arr) => {
                  const isLast = index === arr.length - 1;
                  const trackVal = stat.required
                    ? true
                    : stat.key === 'goal_contributions'
                    ? false
                    : !!formData.stats_config[stat.key]?.track;
                  const showVal = !!formData.stats_config[stat.key]?.show;

                  const trackIsLocked = stat.required || stat.key === 'goal_contributions';

                  const updateStat = (field, value) => {
                    setFormData(prev => ({
                      ...prev,
                      stats_config: {
                        ...prev.stats_config,
                        [stat.key]: {
                          ...prev.stats_config[stat.key],
                          [field]: value,
                        },
                      },
                    }));
                  };

                  return (
                    <div
                      key={stat.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 80px',
                        padding: '12px 16px',
                        alignItems: 'center',
                        borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                        backgroundColor: trackVal || showVal ? '#f9fffe' : '#ffffff',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Stat name + icon */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{stat.icon}</span>
                          <div>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#111827',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}>
                              {stat.name}
                              {stat.required && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: '#6b7280',
                                  backgroundColor: '#f3f4f6',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '1px 6px',
                                }}>
                                  🔒 Required
                                </span>
                              )}
                            </div>
                            {stat.trackNote && (
                              <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                                💡 {stat.trackNote}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Track toggle */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ToggleSwitch
                          checked={trackVal}
                          onChange={() => updateStat('track', !trackVal)}
                          disabled={trackIsLocked}
                        />
                      </div>

                      {/* Show toggle */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ToggleSwitch
                          checked={showVal}
                          onChange={() => updateStat('show', !showVal)}
                          disabled={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 6 — REVIEW & CREATE
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-[var(--txt)] border-b border-[var(--border)] pb-2 mb-4">
              Review Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Tournament Name',    value: formData.name },
                { label: 'Ground Type',        value: formData.ground_type },
                { label: 'Age Category',       value: AGE_CATEGORIES.find(c => c.value === formData.age_category)?.label || formData.age_category },
                { label: 'Organising Team Name',    value: formData.area_name || 'Not Specified' },
                { label: 'Tournament Format',  value: formData.tournament_type === 'league' ? 'League Only' : formData.tournament_type === 'knockout' ? 'Knockout Only' : 'League + Knockout' },
                { label: 'Home & Away',        value: formData.home_and_away ? 'Yes ✅' : 'No ❌' },
                ...(formData.tournament_type === 'knockout' || formData.tournament_type === 'league_knockout' ? [
                  { label: 'Third Place Playoff', value: formData.third_place_option ? 'Yes ✅' : 'No ❌' }
                ] : []),
                { label: 'Max Teams',          value: `${formData.max_teams} Teams` },
                { label: 'Fixture Generation', value: formData.fixture_generation_mode === 'auto' ? '⚡ Auto Generate' : '✏️ Manual Entry' },
                { label: 'Private Tournament', value: formData.is_private ? 'Yes ✅' : 'No ❌' },
                { label: 'Public Stats',       value: formData.public_stats ? 'Yes ✅' : 'No ❌' },
                { label: 'Age Verification',   value: formData.age_verification_required ? 'Required ✅' : 'Not Required ❌' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)] shadow-sm">
                  <span className="text-xs font-semibold text-[var(--txt2)] uppercase tracking-wider block">{item.label}</span>
                  <span className="text-sm font-extrabold text-[var(--txt)] mt-1 block">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Fixture estimate */}
            {fixtureEstimate && formData.fixture_generation_mode === 'auto' && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wider block">Estimated Fixtures</span>
                <span className="text-lg font-black text-green-700 dark:text-green-400 mt-1 block">{fixtureEstimate.total} matches</span>
                <span className="text-xs text-green-700/80 dark:text-green-400/80">{fixtureEstimate.desc}</span>
              </div>
            )}

            {/* Team names summary */}
            {formData.team_names.some(n => n.trim()) && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--txt2)] uppercase tracking-wider block mb-2">Teams Registered</span>
                <div className="flex flex-wrap gap-2">
                  {formData.team_names.filter(n => n.trim()).map((name, i) => (
                    <span key={i} className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900/40 text-xs px-3 py-1 rounded-lg font-bold">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Document types accepted */}
            {formData.age_verification_required && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--txt2)] uppercase tracking-wider block mb-2">Accepted Documents</span>
                <div className="flex flex-wrap gap-2">
                  {formData.accept_aadhaar            && <span className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900/40 text-xs px-3 py-1 rounded-lg font-bold">Aadhaar Card</span>}
                  {formData.accept_school_certificate && <span className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900/40 text-xs px-3 py-1 rounded-lg font-bold">School Certificate</span>}
                  {formData.accept_birth_certificate  && <span className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900/40 text-xs px-3 py-1 rounded-lg font-bold">Birth Certificate</span>}
                </div>
              </div>
            )}

            {/* Enabled Awards */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--txt2)] uppercase tracking-wider block mb-1">Enabled Awards</span>
              <p className="text-sm font-bold text-[var(--txt)] mt-1">
                {Object.keys(formData.awards_config)
                  .filter(key => key !== 'man_of_match' && formData.awards_config[key]?.enabled)
                  .map(key => AWARDS_LIST.find(a => a.key === key)?.name)
                  .concat(formData.awards_config.man_of_match ? ['Man of the Match'] : [])
                  .filter(Boolean)
                  .join(', ') || 'None Selected'}
              </p>
            </div>
          </div>
        )}

        {/* ── Wizard navigation buttons ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '24px',
          marginTop: '24px',
          borderTop: '1px solid #e5e7eb',
        }}>

          {/* BACK BUTTON */}
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                border: '2px solid #374151',
                borderRadius: '12px',
                padding: '10px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                minWidth: '110px',
                justifyContent: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#111827';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#374151';
              }}
            >
              {/* Left arrow */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span style={{ color: '#111827', fontWeight: '600' }}>Back</span>
            </button>
          ) : (
            <div /> /* spacer */
          )}

          {/* NEXT / CREATE BUTTON */}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: '2px solid #15803d',
                borderRadius: '12px',
                padding: '10px 28px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s',
                minWidth: '130px',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#166534';
                e.currentTarget.style.borderColor = '#166534';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#15803d';
                e.currentTarget.style.borderColor = '#15803d';
              }}
            >
              <span style={{ color: '#ffffff', fontWeight: '700' }}>Next</span>
              {/* Right arrow */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : (
            /* FINAL STEP — Create Tournament button */
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: loading ? '#86efac' : '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 28px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                minWidth: '200px',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  {/* Spinner */}
                  <svg style={{ animation: 'spin 1s linear infinite' }}
                       width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/>
                    <path d="M4 12a8 8 0 018-8" stroke="#ffffff" strokeWidth="4"
                          strokeLinecap="round"/>
                  </svg>
                  <span style={{ color: '#ffffff' }}>{isEdit ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <span style={{ color: '#ffffff' }}>{isEdit ? '💾 Save Changes' : '✅ Create Tournament'}</span>
                </>
              )}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
