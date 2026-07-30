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
      padding: '0 12px',
      height: '36px',
      backgroundColor: won ? '#f0fdf4' : lost ? '#f9fafb' : '#ffffff',
      borderLeft: won ? '3.5px solid #22c55e' : '3.5px solid transparent',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: won ? '#22c55e' : lost ? '#cbd5e1' : '#e2e8f0',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '13px',
          fontWeight: won ? '700' : '500',
          color: team
            ? won ? '#0f172a'
            : lost ? '#64748b'
            : '#334155'
            : '#94a3b8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '120px',
        }}>
          {team ? team.name : 'TBD'}
        </span>
      </div>
      {isCompleted && score !== null && score !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: won ? '800' : '500',
            color: won ? '#16a34a' : lost ? '#64748b' : '#334155',
          }}>
            {score}
          </span>
          {penaltyScore !== null && penaltyScore !== undefined && (
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              padding: '1px 4px',
              borderRadius: '4px',
            }}>
              {penaltyScore}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      onClick={() => editable && onEdit(match)}
      style={{
        width: '190px',
        height: '74px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        cursor: editable ? 'pointer' : 'default',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => {
        if (editable) {
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)';
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {teamRow(match.team_a, match.score_a, aWon, aLost, match.penalty_score_a)}
      <div style={{ height: '1.5px', backgroundColor: '#f1f5f9' }} />
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

  // Expose refresh function to parent via window event
  useEffect(() => {
    const handler = () => fetchBracket();
    window.addEventListener('bracket:refresh', handler);
    return () => window.removeEventListener('bracket:refresh', handler);
  }, [tournamentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
        Loading bracket...
      </div>
    );
  }

  if (!data || data.rounds.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '60px 24px',
        backgroundColor: '#f8fafc', borderRadius: '16px',
        border: '2px dashed #cbd5e1',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚔️</div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
          Knockout bracket not created yet
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Generate knockout fixtures from the Fixtures tab to see the bracket here.
        </div>
      </div>
    );
  }

  const animationStyles = (
    <style>{`
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0px); }
      }
      .bracket-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 32px;
        position: relative;
      }
      .match-card-wrapper {
        position: relative;
        transition: all 0.2s ease;
      }
    `}</style>
  );

  const preFinalRounds = data.rounds.filter(r => r.stage !== 'final');
  const finalRound = data.rounds.find(r => r.stage === 'final');
  const finalMatch = finalRound?.matches?.find(m => m.stage === 'final');
  const thirdMatch = finalRound?.matches?.find(m => m.stage === 'third_place');
  const championName = data.champion;

  const trophyBox = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px',
      borderRadius: '20px',
      background: championName 
        ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' 
        : '#ffffff',
      border: championName ? '2px solid #fbbf24' : '2px dashed #e2e8f0',
      boxShadow: championName ? '0 10px 25px -5px rgba(251, 191, 36, 0.2)' : 'none',
      width: '210px',
      textAlign: 'center',
      transition: 'all 0.3s ease-in-out',
    }}>
      {championName ? (
        <>
          <div style={{
            fontSize: '44px',
            lineHeight: 1,
            filter: 'drop-shadow(0 4px 6px rgba(217, 119, 6, 0.15))',
            animation: 'float 3s ease-in-out infinite',
            marginBottom: '10px',
          }}>
            🏆
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: '850',
            color: '#d97706',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '3px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            CHAMPION
          </span>
          <div style={{
            fontSize: '16px',
            fontWeight: '900',
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: '1.2',
            wordBreak: 'break-word',
          }}>
            {championName}
          </div>
        </>
      ) : (
        <>
          <div style={{
            fontSize: '40px',
            lineHeight: 1,
            opacity: 0.25,
            marginBottom: '10px',
          }}>
            🏆
          </div>
          <span style={{
            fontSize: '9px',
            fontWeight: '800',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '3px 8px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px',
          }}>
            Awaiting Final
          </span>
          <div style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#94a3b8',
          }}>
            Winner takes the crown
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', padding: '20px 8px' }}>
      {animationStyles}
      <div style={{ 
        display: 'flex', 
        alignItems: 'stretch', 
        minWidth: 'fit-content',
        minHeight: '460px',
      }}>
        {/* 1. Pre-Final Rounds */}
        {preFinalRounds.map((round, roundIdx) => {
          const gap = Math.pow(2, roundIdx) * 16 + (Math.pow(2, roundIdx) - 1) * 60;
          return (
            <div key={round.stage} className="bracket-col">
              <div style={{
                fontSize: '11px', 
                fontWeight: '800', 
                color: '#64748b',
                textTransform: 'uppercase', 
                letterSpacing: '0.08em',
                textAlign: 'center', 
                marginBottom: '24px',
              }}>
                {round.name}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                flex: 1,
                position: 'relative',
              }}>
                {(() => {
                  const pairs = [];
                  for (let i = 0; i < round.matches.length; i += 2) {
                    pairs.push([round.matches[i], round.matches[i + 1]]);
                  }
                  
                  return pairs.map(([matchA, matchB], pairIdx) => (
                    <div key={`${matchA?.id}-${matchB?.id}`} style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: `${gap}px`,
                      width: '190px',
                    }}>
                      {/* Match A */}
                      <div className="match-card-wrapper">
                        {roundIdx > 0 && (
                          <div className="bracket-connector-h-left" style={{
                            position: 'absolute',
                            top: '37px',
                            transform: 'translateY(-50%)',
                            left: '-32px',
                            width: '32px',
                            height: '2px',
                            backgroundColor: '#cbd5e1',
                          }} />
                        )}
                        <MatchCard
                          match={matchA}
                          onEdit={onEditMatch}
                          editable={editable && matchA.team_a && matchA.team_b}
                        />
                      </div>

                      {/* Match B */}
                      <div className="match-card-wrapper">
                        {roundIdx > 0 && (
                          <div className="bracket-connector-h-left" style={{
                            position: 'absolute',
                            top: '37px',
                            transform: 'translateY(-50%)',
                            left: '-32px',
                            width: '32px',
                            height: '2px',
                            backgroundColor: '#cbd5e1',
                          }} />
                        )}
                        <MatchCard
                          match={matchB}
                          onEdit={onEditMatch}
                          editable={editable && matchB.team_a && matchB.team_b}
                        />
                      </div>

                      {/* Connector lines for the pair */}
                      <div style={{
                        position: 'absolute',
                        right: '-32px',
                        top: '37px', // center of Match A
                        bottom: '37px', // center of Match B
                        width: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}>
                        {/* Upper half vertical line with top right curve */}
                        <div style={{
                          flex: 1,
                          borderRight: '2px solid #cbd5e1',
                          borderTop: '2px solid #cbd5e1',
                          borderTopRightRadius: '8px',
                          height: '50%',
                        }} />
                        {/* Middle horizontal line pointing to next round */}
                        <div style={{
                          height: '2px',
                          width: '32px',
                          backgroundColor: '#cbd5e1',
                          position: 'absolute',
                          right: '-32px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }} />
                        {/* Lower half vertical line with bottom right curve */}
                        <div style={{
                          flex: 1,
                          borderRight: '2px solid #cbd5e1',
                          borderBottom: '2px solid #cbd5e1',
                          borderBottomRightRadius: '8px',
                          height: '50%',
                        }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          );
        })}

        {/* 2. Finals & Champion Column (Climax) */}
        <div className="bracket-col" style={{ minWidth: '240px' }}>
          <div style={{
            fontSize: '11px', 
            fontWeight: '800', 
            color: '#64748b',
            textTransform: 'uppercase', 
            letterSpacing: '0.08em',
            textAlign: 'center', 
            marginBottom: '24px',
          }}>
            Finals
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
            position: 'relative',
            width: '100%',
          }}>
            {/* Left connector to Final Match */}
            {preFinalRounds.length > 0 && finalMatch && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '-32px',
                width: '32px',
                height: '2px',
                backgroundColor: '#cbd5e1',
                zIndex: 1,
              }} />
            )}

            {/* Top: Trophy/Champion Box */}
            <div style={{
              position: 'absolute',
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
            }}>
              {trophyBox}
            </div>

            {/* Middle: Final Match Card */}
            {finalMatch && (
              <div style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 2,
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '850',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#d97706',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(217,119,6,0.05)',
                }}>
                  Final
                </span>
                <MatchCard
                  match={finalMatch}
                  onEdit={onEditMatch}
                  editable={editable && finalMatch.team_a && finalMatch.team_b}
                />
              </div>
            )}

            {/* Bottom: Bronze-Final Match Card */}
            {thirdMatch && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 2,
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '850',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#2563eb',
                  backgroundColor: '#dbeafe',
                  border: '1px solid #bfdbfe',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.05)',
                }}>
                  Bronze-Final
                </span>
                <MatchCard
                  match={thirdMatch}
                  onEdit={onEditMatch}
                  editable={editable && thirdMatch.team_a && thirdMatch.team_b}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
