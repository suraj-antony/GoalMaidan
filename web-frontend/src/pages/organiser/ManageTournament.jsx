import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import ManageTeams from './ManageTeams';
import ManageFixtures from './ManageFixtures';
import { Users, Calendar, Settings, ExternalLink } from 'lucide-react';

const TABS = [
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'fixtures', label: 'Fixtures', icon: Calendar },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function ManageTournament() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('teams');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tournaments/${id}/`)
      .then(res => setTournament(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-[var(--txt2)]">Loading tournament...</div>;
  if (!tournament) return <div className="text-center py-20 text-red-500">Tournament not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--txt2)] mb-2">
          <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
          <span>/</span>
          <span className="font-medium text-[var(--txt)]">{tournament.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{tournament.ground_type}</span>
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">{tournament.tournament_type}</span>
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">{tournament.age_category}</span>
              <StatusBadge status={tournament.status} />
            </div>
          </div>
          <Link
            to={`/tournament/${id}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] transition-colors"
          >
            <ExternalLink size={16} /> Public View
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg2)] p-1 rounded-xl mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${activeTab === tab.key ? 'bg-[var(--card)] text-primary-600 shadow-sm' : 'text-[var(--txt2)] hover:text-[var(--txt)]'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'teams' && <ManageTeams tournament={tournament} />}
      {activeTab === 'fixtures' && <ManageFixtures tournament={tournament} />}
      {activeTab === 'settings' && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-xl font-bold mb-4">Tournament Settings</h2>
          <div className="space-y-3">
            {[
              ['Age Verification', tournament.age_verification_required ? 'Required' : 'Not required'],
              ['Aadhaar Required', tournament.aadhaar_required ? 'Yes' : 'No'],
              ['Certificate Required', tournament.certificate_required ? 'Yes' : 'No'],
              ['Public Stats', tournament.public_stats ? 'Visible' : 'Hidden'],
              ['Access Type', tournament.access_type || 'open'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--txt2)]">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
