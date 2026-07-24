import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { Search, Filter, Lock, Globe, Trophy } from 'lucide-react';

export default function ViewerDashboard() {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    api.get('/tournaments/')
      .then(res => {
        setTournaments(res.data);
        setFiltered(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = tournaments;
    if (search) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.area_name || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(t => t.tournament_type === typeFilter);
    setFiltered(result);
  }, [search, statusFilter, typeFilter, tournaments]);

  const handleRequestAccess = async (tournamentId) => {
    try {
      await api.post('/teams/access-requests/', { tournament: tournamentId });
      alert('Access request sent! The organiser will review it.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error sending request');
    }
  };

  const statusColor = {
    upcoming: 'bg-blue-100 text-blue-700',
    live: 'bg-green-100 text-green-700 animate-pulse',
    completed: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Discover Tournaments</h1>
      <p className="text-[var(--txt2)] mb-8">Follow your favourite local football tournaments.</p>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-[var(--txt2)]" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            className="pl-10 w-full rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--txt)] focus:border-primary-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="live">{t('live')}</option>
          <option value="upcoming">{t('upcoming')}</option>
          <option value="completed">{t('completed')}</option>
        </select>
        <select
          className="rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--txt)] focus:border-primary-500"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="league">League</option>
          <option value="knockout">Knockout</option>
        </select>
      </div>

      {/* Tournament Grid */}
      {loading ? (
        <div className="text-center py-20 text-[var(--txt2)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)]">
          <Trophy size={48} className="mx-auto text-[var(--txt2)] mb-4" />
          <p className="font-semibold">No tournaments found</p>
          <p className="text-sm text-[var(--txt2)] mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tournament => (
            <div key={tournament.id} className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-primary-300 transition-all group">
              {/* Card Header */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-4 text-white">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">⚽</span>
                  <div className="flex gap-2">
                    {tournament.access_type === 'private' ? (
                      <Lock size={16} className="opacity-80" />
                    ) : (
                      <Globe size={16} className="opacity-80" />
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tournament.status === 'live' ? 'bg-white/30' : 'bg-white/20'}`}>
                      {tournament.status === 'live' ? '🔴 LIVE' : tournament.status || 'upcoming'}
                    </span>
                  </div>
                </div>
                <h3 className="font-bold text-lg mt-2 leading-tight">{tournament.name}</h3>
                <p className="text-sm opacity-80 mt-0.5">{tournament.area_name || 'N/A'}</p>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bg2)] text-[var(--txt2)]">{tournament.ground_type}</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bg2)] text-[var(--txt2)]">{tournament.tournament_type}</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bg2)] text-[var(--txt2)]">{tournament.age_category}</span>
                </div>

                {tournament.access_type === 'private' && !tournament.has_access ? (
                  <button
                    onClick={() => handleRequestAccess(tournament.id)}
                    className="w-full py-2 text-sm font-semibold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    🔑 {t('request_access')}
                  </button>
                ) : (
                  <Link
                    to={`/tournament/${tournament.id}`}
                    className="block w-full py-2 text-center text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {t('view_stats')} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
