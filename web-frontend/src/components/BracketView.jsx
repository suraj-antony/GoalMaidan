import { useEffect, useState } from 'react';
import api from '../api/axios';

const MatchCard = ({ match, onEdit, editable }) => {
  const isCompleted = match.status === 'completed';

  // Determine winner via explicit winner field or score comparison
  const winnerId = match.winner
    ? String(match.winner)
    : match.score_a > match.score_b
    ? String(match.team_a?.id)
    : match.score_b > match.score_a
    ? String(match.team_b?.id)
    : null;

  const aWon = isCompleted && winnerId && String(match.team_a?.id) === winnerId;
  const bWon = isCompleted && winnerId && String(match.team_b?.id) === winnerId;
  const aLost = isCompleted && winnerId && !aWon;
  const bLost = isCompleted && winnerId && !bWon;

  const teamRow = (team, score, won, lost, penaltyScore) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 10px',
      backgroundColor: won ? '#f0fdf4' : lost ? '#f9fafb' : '#ffffff',
      transition: 'background-color 0.15s',
    }}>
      <span style={{
        fontSize: '12.5px',
        fontWeight: won ? '700' : '500',
        color: team
          ? won ? '#15803d'
          : lost ? '#9ca3af'
          : '#111827'
          : '#9ca3af',
        textDecoration: lost ? 'line-through' : 'none',
        textDecorationColor: '#9ca3af',
        opacity: lost ? 0.75 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {team ? team.name : 'TBD'}
      </span>
      {isCompleted && (
        <span style={{
          fontSize: '13px',
          fontWeight: won ? '700' : '500',
          color: won ? '#15803d' : lost ? '#9ca3af' : '#6b7280',
          minWidth: '18px',
          textAlign: 'right',
          opacity: lost ? 0.65 : 1,
        }}>
          {score}
          {penaltyScore !== null && penaltyScore !== undefined && (
            <span style={{ fontSize: '11px', fontWeight: '500', marginLeft: '3px', color: '#9ca3af' }}>
              ({penaltyScore})
            </span>
          )}
        </span>
      )}
    </div>
  );

  return (
    <div
      onClick={() => editable && onEdit(match)}
      style={{
        width: '210px',
        borderRadius: '10px',
        border: '1.5px solid #e5e7eb',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        cursor: editable ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (editable) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
    >
      {teamRow(match.team_a, match.score_a, aWon, aLost, match.penalty_score_a)}
      <div style={{ height: '1px', backgroundColor: '#f3f4f6' }} />
      {teamRow(match.team_b, match.score_b, bWon, bLost, match.penalty_score_b)}
    </div>
  );
};

export const BracketView = ({ tournamentId, onEditMatch, editable = true }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBracket = async () => {
    try {
      const res = await api.get(`/fixtures/bracket/${tournamentId}/`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load bracket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBracket();
  }, [tournamentId]);

  // Expose refresh function to parent via window event (simple approach)
  useEffect(() => {
    const handler = () => fetchBracket();
    window.addEventListener('bracket:refresh', handler);
    return () => window.removeEventListener('bracket:refresh', handler);
  }, [tournamentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
        Loading bracket...
      </div>
    );
  }

  if (!data || data.rounds.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '60px 24px',
        backgroundColor: '#f9fafb', borderRadius: '16px',
        border: '2px dashed #d1d5db',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚔️</div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
          Knockout bracket not created yet
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          Generate knockout fixtures from the Fixtures tab to see the bracket here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', padding: '20px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'fit-content' }}>
        {data.rounds.map((round, roundIdx) => {
          const gap = Math.pow(2, roundIdx) * 24 + (Math.pow(2, roundIdx) - 1) * 76;
          return (
            <div key={round.stage} style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '0 38px',
              position: 'relative',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: '700', color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                textAlign: 'center', marginBottom: '20px',
              }}>
                {round.name}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                flex: 1,
                gap: `${gap}px`,
              }}>
                {round.matches.map((match, matchIdx) => (
                  <div key={match.id} style={{ position: 'relative' }}>
                    <MatchCard
                      match={match}
                      onEdit={onEditMatch}
                      editable={editable && match.team_a && match.team_b}
                    />

                    {/* Connector line to next round */}
                    {roundIdx < data.rounds.length - 1 && (
                      <>
                        <div className="bracket-connector-h" style={{
                          position: 'absolute',
                          top: '50%',
                          right: '-38px',
                          width: '38px',
                          height: '2px',
                          backgroundColor: '#d1d5db',
                        }} />
                        {matchIdx % 2 === 0 && (
                          <div className="bracket-connector-v" style={{
                            position: 'absolute',
                            top: '50%',
                            right: '-38px',
                            width: '2px',
                            height: `${gap + 46}px`,
                            backgroundColor: '#d1d5db',
                          }} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Champion box */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 38px',
          minWidth: '180px',
        }}>
          <div style={{
            width: '90px', height: '90px',
            borderRadius: '50%',
            backgroundColor: data.champion ? '#fef3c7' : '#f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px',
            marginBottom: '12px',
            border: data.champion ? '3px solid #fbbf24' : '3px dashed #d1d5db',
          }}>
            🏆
          </div>
          <div style={{
            fontSize: '15px', fontWeight: '800',
            color: data.champion ? '#92400e' : '#9ca3af',
            textAlign: 'center',
          }}>
            {data.champion || 'TBD'}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
            {data.champion ? 'CHAMPION' : 'Awaiting Final'}
          </div>
        </div>
      </div>
    </div>
  );
};
