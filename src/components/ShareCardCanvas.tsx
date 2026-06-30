import { forwardRef } from 'react'
import type { Match, Prediction } from '../lib/types'
import { getFlag } from '../lib/countryFlags'

interface Props {
  match: Match
  myPred: Prediction | undefined
  pts: number | null
  myRank: number | undefined
  phrase: string
  cardType: 'pre' | 'post'
}

const ShareCardCanvas = forwardRef<HTMLDivElement, Props>(
  ({ match, myPred, pts, myRank, phrase, cardType }, ref) => {
    const homeFlag = getFlag(match.home_team_code, match.home_team) ?? '🏴'
    const awayFlag = getFlag(match.away_team_code, match.away_team) ?? '🏴'

    const ptsColor =
      pts === 10
        ? 'oklch(87% 0.195 95)'
        : pts === 7
          ? 'oklch(80% 0.16 80)'
          : pts === 5
            ? 'oklch(57% 0.140 155)'
            : 'oklch(55% 0.018 155)'

    const ptsLabel =
      pts === 10
        ? '✅ Placar exato! +10 pts'
        : pts === 7
          ? '✅ Saldo ou empate! +7 pts'
          : pts === 5
            ? '✅ Resultado certo! +5 pts'
            : pts === 0
              ? '❌ Errei. 0 pts'
              : null

    return (
      <div
        ref={ref}
        style={{
          width: 540,
          height: 540,
          background: 'linear-gradient(160deg, oklch(22% 0.042 155) 0%, oklch(13% 0.020 155) 100%)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          padding: '36px 40px 32px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Top accent stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'oklch(87% 0.195 95)',
          }}
        />

        {/* Decorative bg circle */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: -80,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'oklch(87% 0.195 95 / 0.05)',
            pointerEvents: 'none',
          }}
        />

        {/* App header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ fontSize: 15 }}>🏆</span>
          <span
            style={{
              color: 'oklch(87% 0.195 95)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Bolão Copa 2026
          </span>
        </div>

        {/* Teams row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          {/* Home team */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              maxWidth: 160,
            }}
          >
            <span style={{ fontSize: 52, lineHeight: 1 }}>{homeFlag}</span>
            <span
              style={{
                color: 'oklch(95% 0.008 155)',
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {match.home_team}
            </span>
          </div>

          {/* Center */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              padding: '0 8px',
            }}
          >
            {cardType === 'post' ? (
              <>
                <div
                  style={{
                    color: 'oklch(95% 0.008 155)',
                    fontSize: 34,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {match.home_score}
                  <span
                    style={{
                      color: 'oklch(55% 0.018 155)',
                      fontWeight: 300,
                      margin: '0 4px',
                    }}
                  >
                    ×
                  </span>
                  {match.away_score}
                </div>
                <span
                  style={{
                    color: 'oklch(55% 0.018 155)',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  resultado
                </span>
              </>
            ) : (
              <span
                style={{
                  color: 'oklch(55% 0.018 155)',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                VS
              </span>
            )}
          </div>

          {/* Away team */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
              maxWidth: 160,
            }}
          >
            <span style={{ fontSize: 52, lineHeight: 1 }}>{awayFlag}</span>
            <span
              style={{
                color: 'oklch(95% 0.008 155)',
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.2,
                textAlign: 'right',
              }}
            >
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Info box */}
        <div
          style={{
            background: 'oklch(95% 0.008 155 / 0.06)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {cardType === 'pre' && myPred != null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  color: 'oklch(73% 0.022 155)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Meu palpite
              </span>
              <div
                style={{
                  background: 'oklch(87% 0.195 95)',
                  color: 'oklch(12% 0.025 155)',
                  borderRadius: 8,
                  padding: '3px 12px',
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                }}
              >
                {myPred.home_score} × {myPred.away_score}
              </div>
            </div>
          )}

          {cardType === 'post' && (
            <>
              {myPred != null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      color: 'oklch(73% 0.022 155)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Meu palpite
                  </span>
                  <span
                    style={{
                      color: 'oklch(95% 0.008 155)',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {myPred.home_score} × {myPred.away_score}
                  </span>
                </div>
              )}
              {ptsLabel != null && (
                <div
                  style={{
                    color: ptsColor,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {ptsLabel}
                </div>
              )}
              {myRank != null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      color: 'oklch(73% 0.022 155)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Ranking
                  </span>
                  <span
                    style={{
                      color:
                        myRank === 1 ? 'oklch(87% 0.195 95)' : 'oklch(95% 0.008 155)',
                      fontSize: 16,
                      fontWeight: 800,
                    }}
                  >
                    #{myRank}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Phrase + footer */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <p
            style={{
              color: 'oklch(73% 0.022 155)',
              fontSize: 14,
              fontStyle: 'italic',
              lineHeight: 1.5,
              margin: '0 0 14px',
            }}
          >
            "{phrase}"
          </p>
          <span
            style={{
              color: 'oklch(87% 0.195 95)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            bolao.app
          </span>
        </div>
      </div>
    )
  },
)

ShareCardCanvas.displayName = 'ShareCardCanvas'
export default ShareCardCanvas
