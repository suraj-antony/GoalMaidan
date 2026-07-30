import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Plus, Trophy, Users, ChevronRight, Activity, Award } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

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

export default function OrganiserDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals & Toast State
  const [confirmingTournament, setConfirmingTournament] = useState(null);
  const [activating, setActivating] = useState(false);
  const [toast, setToast] = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // tournament object to delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const menuRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideAnyMenu = Object.values(menuRefs.current).some(
        ref => ref && ref.contains(e.target)
      );
      if (!isInsideAnyMenu) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !deleteLoading) {
        setDeleteTarget(null);
        setDeleteConfirmText('');
        setOpenMenuId(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteLoading]);

  useEffect(() => {
    api.get('/tournaments/my/')
      .then(res => setTournaments(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to fetch tournaments.');
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleActivate = async () => {
    if (!confirmingTournament) return;
    setActivating(true);
    try {
      const res = await api.patch(`/tournaments/${confirmingTournament.id}/activate/`);
      // Update state without full page reload
      setTournaments(prev => prev.map(t => t.id === confirmingTournament.id ? { ...t, status: 'active' } : t));
      showToast('Tournament activated! Matches can now begin.', 'success');
      setConfirmingTournament(null);
    } catch (err) {
      const data = err.response?.data;
      const errMsg = data?.error || 'Failed to activate tournament.';
      const hint = data?.hint || '';
      const canGenerate = data?.can_generate;

      if (canGenerate) {
        navigate(`/organiser/tournament/${confirmingTournament.id}/manage`);
        showToast('Please generate fixtures first, then activate.', 'error');
      } else {
        showToast(hint ? `${errMsg} ${hint}` : errMsg, 'error');
      }
      setConfirmingTournament(null);
    } finally {
      setActivating(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/tournaments/${deleteTarget.id}/`);

      // Remove tournament from local state immediately
      setTournaments(prev => prev.filter(t => t.id !== deleteTarget.id));

      // Show success toast
      showToast(`"${deleteTarget.name}" has been deleted.`, 'success');

      // Close modal
      setDeleteTarget(null);
      setDeleteConfirmText('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete tournament. Please try again.';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalTournaments = tournaments.length;
  const liveTournaments = tournaments.filter(t => t.status === 'active').length;
  const completedTournaments = tournaments.filter(t => t.status === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen relative">
      
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 bg-gradient-to-r from-emerald-850 to-emerald-900/30 p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--txt)]">
            Organiser <span className="text-emerald-600 dark:text-emerald-400">Dashboard</span>
          </h1>
          <p className="text-[var(--txt2)] mt-1.5 font-medium">
            Welcome back, <span className="font-semibold text-emerald-600 dark:text-emerald-400">{user?.name}</span>! Manage your tournaments and view progress.
          </p>
        </div>
        <Link
          to="/dashboard/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-center"
        >
          <Plus size={20} />
          {t('create_tournament')}
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Tournaments', value: totalTournaments, icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/35' },
          { label: 'Live Now', value: liveTournaments, icon: Activity, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/35' },
          { label: 'Completed', value: completedTournaments, icon: Award, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/35' },
        ].map(stat => (
          <div key={stat.label} className={`bg-[var(--card)] rounded-2xl p-6 border ${stat.color.split(' ').slice(2).join(' ')} shadow-sm flex items-center gap-5 transition-transform hover:translate-y-[-2px]`}>
            <div className={`p-4 rounded-xl ${stat.color.split(' ').slice(0, 2).join(' ')}`}>
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[var(--txt)]">{stat.value}</p>
              <p className="text-sm font-semibold text-[var(--txt2)] mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tournament List Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--txt)] flex items-center gap-2">
          <span>My Tournaments</span>
          <span className="text-sm font-semibold bg-emerald-550/10 text-emerald-600 px-2.5 py-0.5 rounded-full">
            {totalTournaments}
          </span>
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--txt2)] bg-[var(--card)] rounded-2xl border border-[var(--border)]">
          <div className="animate-spin text-4xl mb-4 text-emerald-600">⚽</div>
          <p className="font-semibold">Loading tournaments...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)] shadow-sm px-6">
          <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-5 border border-emerald-100 dark:border-emerald-900/30">
            <Trophy size={32} />
          </div>
          <p className="text-xl font-extrabold text-[var(--txt)] mb-2">No tournaments yet</p>
          <p className="text-[var(--txt2)] max-w-sm mx-auto mb-6">Create your first football tournament and start managing teams, schedules, and matches!</p>
          <Link to="/dashboard/create" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md">
            <Plus size={18} />
            Create Tournament
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map(tournament => {
            return (
              <div
                key={tournament.id}
                onClick={() => navigate(`/organiser/tournament/${tournament.id}/manage`)}
                className="flex flex-col justify-between p-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] hover:border-emerald-500/50 hover:shadow-lg transition-all group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
                
                <div>
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-extrabold text-lg text-[var(--txt)] group-hover:text-emerald-600 transition-colors leading-snug">
                      {tournament.name}
                    </h3>
                    
                    <div className="flex items-center gap-2" ref={(el) => menuRefs.current[tournament.id] = el}>
                      {/* Status badge */}
                      <StatusBadge status={tournament.status} />

                      {/* 3-dot menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(prev => prev === tournament.id ? null : tournament.id);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700
                                     hover:bg-gray-100 transition-colors duration-150"
                          aria-label="Tournament options"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor"
                               viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5"/>
                            <circle cx="12" cy="12" r="1.5"/>
                            <circle cx="12" cy="19" r="1.5"/>
                          </svg>
                        </button>

                        {/* Dropdown menu */}
                        {openMenuId === tournament.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl shadow-xl
                                          border border-gray-200 py-1 overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                navigate(`/organiser/tournament/${tournament.id}/manage`);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5
                                         text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              ⚙️ <span>Manage</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                navigate(`/organiser/tournament/${tournament.id}/edit`);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5
                                         text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              ✏️ <span>Edit Tournament</span>
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setDeleteTarget(tournament);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5
                                         text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              🗑️ <span>Delete Tournament</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Area */}
                  <p className="text-xs font-semibold text-[var(--txt2)] uppercase tracking-wider mb-4">
                    📍 {tournament.area_name || user?.area_name || 'Tournament Ground'}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
                      {tournament.ground_type}
                    </span>
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
                      {ageLabels[tournament.age_category] || tournament.age_category}
                    </span>
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
                      {typeLabels[tournament.tournament_type] || tournament.tournament_type}
                    </span>
                  </div>
                </div>

                {/* Footer info: Teams and Manage button */}
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-bold text-[var(--txt)]">{tournament.team_count || 0}</span>
                    <span className="text-sm text-[var(--txt2)]">teams registered</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/organiser/tournament/${tournament.id}/manage`);
                    }}
                    className="text-xs font-bold text-green-700 hover:text-green-900 flex items-center gap-0.5 hover:underline"
                  >
                    <span>Manage</span>
                    <span>›</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activation Confirmation Modal */}
      {confirmingTournament && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-6">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
                Activate Tournament?
              </h2>
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm space-y-2 mb-6">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">Once activated:</p>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 font-semibold space-y-1">
                  <li>Matches will begin</li>
                  <li>Team list will be locked</li>
                  <li>New teams cannot be added</li>
                </ul>
              </div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Are you sure you want to start <span style={{ fontWeight: '800', color: '#15803d' }}>"{ confirmingTournament.name}"</span>?
              </p>
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmingTournament(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  opacity: activating ? 0.5 : 1,
                }}
                disabled={activating}
                onMouseEnter={e => { if (!activating) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={e => { if (!activating) e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activating}
                onClick={handleActivate}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: activating ? 'not-allowed' : 'pointer',
                  opacity: activating ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={e => { if (!activating) e.currentTarget.style.backgroundColor = '#166534'; }}
                onMouseLeave={e => { if (!activating) e.currentTarget.style.backgroundColor = '#15803d'; }}
              >
                {activating ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>✅ Yes, Activate</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

            {/* Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full
                            bg-red-100 mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete Tournament?
            </h2>

            {/* Warning message */}
            <p className="text-sm text-gray-600 text-center mb-2">
              You are about to permanently delete:
            </p>
            <p className="text-base font-semibold text-gray-900 text-center mb-4">
              "{deleteTarget.name}"
            </p>

            {/* Active warning */}
            {deleteTarget.status === 'active' && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-amber-800 font-medium text-center">
                  ⚠️ This tournament is currently <strong>Active</strong>.
                  All matches, results, and stats will be permanently deleted.
                </p>
              </div>
            )}

            {/* Always shown warning */}
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <p className="text-sm text-red-700 text-center">
                This action <strong>cannot be undone</strong>.
                All teams, fixtures, results, stats and awards will be deleted.
              </p>
            </div>

            {/* Confirm by typing name */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="font-bold text-gray-900">"{deleteTarget.name}"</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type tournament name here"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm
                           focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-400"
                autoFocus
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300
                           bg-white text-gray-700 font-medium text-sm
                           hover:bg-gray-50 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTournament}
                disabled={deleteLoading || deleteConfirmText !== deleteTarget.name}
                className="flex-1 px-4 py-2.5 rounded-xl
                           bg-red-600 hover:bg-red-700 active:bg-red-800
                           text-white font-semibold text-sm
                           transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Deleting...
                  </span>
                ) : '🗑️ Yes, Delete'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
