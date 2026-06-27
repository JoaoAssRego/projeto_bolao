import { useState, useRef, useMemo, useEffect } from 'react'
import { toPng } from 'html-to-image'
import type { Match, Prediction } from '../lib/types'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { buildStandings, withRanks } from '../lib/scoring'
import {
  getPhrase,
  contextFromPts,
  type CardTone,
  type CardContext,
} from '../lib/cardPhrases'
import ShareCardCanvas from './ShareCardCanvas'

interface Props {
  match: Match
  myPred: Prediction | undefined
  pts: number | null
  cardType: 'pre' | 'post'
  onClose: () => void
}

const TONES: { id: CardTone; label: string }[] = [
  { id: 'neutro', label: 'Neutro' },
  { id: 'provocador', label: 'Provocador' },
  { id: 'selvagem', label: 'Selvagem' },
]

export default function ShareModal({ match, myPred, pts, cardType, onClose }: Props) {
  const { participants, matches, predictions: allPreds } = useStore()
  const { me } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [tone, setTone] = useState<CardTone>('neutro')
  const [sharing, setSharing] = useState(false)

  const ranking = useMemo(
    () => withRanks(buildStandings(participants, matches, allPreds)),
    [participants, matches, allPreds],
  )
  const myRank = ranking.find((r) => r.participant_id === me?.id)?.rank

  const context: CardContext = cardType === 'pre' ? 'pre' : contextFromPts(pts)
  const [phrase, setPhrase] = useState(() => getPhrase(context, tone))

  useEffect(() => {
    setPhrase(getPhrase(context, tone))
  }, [context, tone])

  async function handleShare() {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'bolao-card.png', { type: 'image/png' })

      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], text: phrase })
      } else {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = 'bolao-card.png'
        link.click()
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'oklch(0% 0 0 / 0.6)',
          zIndex: 50,
        }}
        onClick={onClose}
      />

      {/* Off-screen card for capture */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
        }}
      >
        <ShareCardCanvas
          ref={cardRef}
          match={match}
          myPred={myPred}
          pts={pts}
          myRank={myRank}
          phrase={phrase}
          cardType={cardType}
        />
      </div>

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 51,
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          padding: '16px 20px max(32px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'var(--border)',
            margin: '0 auto',
            flexShrink: 0,
          }}
        />

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              color: 'var(--t1)',
              fontWeight: 700,
              fontSize: 17,
            }}
          >
            Compartilhar card
          </span>
          <button
            onClick={onClose}
            style={{
              color: 'var(--t3)',
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Preview: scaled-down live preview of the card */}
        <div
          style={{
            alignSelf: 'center',
            width: 270,
            height: 270,
            overflow: 'hidden',
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 540,
              height: 540,
              transformOrigin: 'top left',
              transform: 'scale(0.5)',
            }}
          >
            <ShareCardCanvas
              match={match}
              myPred={myPred}
              pts={pts}
              myRank={myRank}
              phrase={phrase}
              cardType={cardType}
            />
          </div>
        </div>

        {/* Tone selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              color: 'var(--t2)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Tom da legenda
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: 12,
                  border:
                    tone === t.id
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border)',
                  background:
                    tone === t.id ? 'var(--accent-muted)' : 'var(--raised)',
                  color: tone === t.id ? 'var(--accent)' : 'var(--t2)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: sharing ? 'var(--raised)' : 'var(--accent)',
            color: sharing ? 'var(--t3)' : 'var(--accent-fg)',
            fontSize: 15,
            fontWeight: 700,
            cursor: sharing ? 'default' : 'pointer',
          }}
        >
          {sharing ? 'Gerando imagem…' : 'Compartilhar no WhatsApp'}
        </button>
      </div>
    </>
  )
}
