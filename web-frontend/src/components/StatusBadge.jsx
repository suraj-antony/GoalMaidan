export const StatusBadge = ({ status }) => {
  const config = {
    scheduled: {
      label: 'Scheduled',
      className: 'bg-gray-100 text-gray-600 border border-gray-300',
    },
    live: {
      label: '🔴 Live',
      className: 'bg-red-100 text-red-700 border border-red-400 animate-pulse',
    },
    completed: {
      label: '✅ Completed',
      className: 'bg-green-100 text-green-700 border border-green-400',
    },
    draft: {
      label: 'Draft',
      className: 'bg-gray-100 text-gray-500 border border-gray-300',
    },
    active: {
      label: '● Active',
      className: 'bg-green-100 text-green-700 border border-green-500 font-semibold',
    },
    completed_tournament: {
      label: '✓ Completed',
      className: 'bg-blue-100 text-blue-700 border border-blue-300',
    },
  };

  const c = config[status?.toLowerCase()] || config.scheduled;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
};

export default StatusBadge;
