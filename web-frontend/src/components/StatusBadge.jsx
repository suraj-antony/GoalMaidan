export const StatusBadge = ({ status }) => {
  const config = {
    scheduled: {
      label: 'Scheduled',
      style: { backgroundColor: 'rgba(113, 113, 122, 0.2)', color: '#d4d4d8', borderColor: 'rgba(113, 113, 122, 0.3)' },
    },
    live: {
      label: '🔴 Live',
      style: { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' },
      animate: true,
    },
    completed: {
      label: '✅ Completed',
      style: { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#86efac', borderColor: 'rgba(34, 197, 94, 0.3)' },
    },
    draft: {
      label: 'Draft',
      style: { backgroundColor: 'rgba(113, 113, 122, 0.25)', color: '#e4e4e7', borderColor: 'rgba(113, 113, 122, 0.3)' },
    },
    active: {
      label: '● Active',
      style: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.3)' },
    },
    completed_tournament: {
      label: '✓ Completed',
      style: { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.3)' },
    },
  };

  const c = config[status?.toLowerCase()] || config.scheduled;

  return (
    <span 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: '700',
        border: '1.5px solid',
        ...c.style
      }}
      className={c.animate ? 'animate-pulse' : ''}
    >
      {c.label}
    </span>
  );
};

export default StatusBadge;
