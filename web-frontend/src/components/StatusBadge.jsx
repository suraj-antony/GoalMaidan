export const StatusBadge = ({ status }) => {
  const config = {
    scheduled: {
      label: 'Scheduled',
      style: { backgroundColor: 'var(--badge-scheduled-bg)', color: 'var(--badge-scheduled-txt)', borderColor: 'var(--badge-scheduled-border)' },
    },
    live: {
      label: '🔴 Live',
      style: { backgroundColor: 'var(--badge-live-bg)', color: 'var(--badge-live-txt)', borderColor: 'var(--badge-live-border)' },
      animate: true,
    },
    completed: {
      label: '✅ Completed',
      style: { backgroundColor: 'var(--badge-completed-bg)', color: 'var(--badge-completed-txt)', borderColor: 'var(--badge-completed-border)' },
    },
    draft: {
      label: 'Draft',
      style: { backgroundColor: 'var(--badge-draft-bg)', color: 'var(--badge-draft-txt)', borderColor: 'var(--badge-draft-border)' },
    },
    active: {
      label: '● Active',
      style: { backgroundColor: 'var(--badge-active-bg)', color: 'var(--badge-active-txt)', borderColor: 'var(--badge-active-border)' },
    },
    completed_tournament: {
      label: '✓ Completed',
      style: { backgroundColor: 'var(--badge-completed-tournament-bg)', color: 'var(--badge-completed-tournament-txt)', borderColor: 'var(--badge-completed-tournament-border)' },
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
