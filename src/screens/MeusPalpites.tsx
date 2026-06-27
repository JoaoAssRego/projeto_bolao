import { useMemo } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { hasResult, isLocked, scoreFor } from '../lib/scoring'
import { formatKickoff } from '../lib/format'

export default function MeusPalpites() {
  const { matches, predictions } = useStore()
  const { me } = useAuth()

  const rows = useMemo(() => {
    if (!me) return []
    const mine = predictions.filter((p) => p.participant_id === me.id)
    return mine
      .map((pred) => {
        const match = matches.find((m) => m.id === pred.match_id)
        return match ? { pred, match, pts: scoreFor(pred, match) } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime())
  }, [matches, predictions, me])

  const total = rows.reduce((sum, r) => sum + (r.pts ?? 0), 0)

  if (!me) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1 pt-2">
        <h1 className="text-lg font-bold text-[var(--t1)]">Meus palpites</h1>
        <div className="text-right">
          <span className="text-xl font-extrabold text-[var(--accent)]">{total}</span>
          <span className="ml-1 text-xs text-[var(--t3)]">pts</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--t3)]">
          Você ainda não palpitou em nenhum jogo. Vá na aba Jogos!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ pred, match, pts }) => {
            const finished = hasResult(match)
            const locked = isLocked(match)
            return (
              <li key={pred.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--t3)]">
                  <span>{match.label ?? ''}</span>
                  <span>{formatKickoff(match.kickoff)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="truncate text-sm text-[var(--t1)]">
                    {match.home_team ?? 'A definir'} <span className="text-[var(--t3)]">×</span>{' '}
                    {match.away_team ?? 'A definir'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--t2)]">
                    Palpite: <strong className="text-[var(--t1)]">{pred.home_score} × {pred.away_score}</strong>
                    {finished && (
                      <span className="text-[var(--t3)]">
                        {' '}
                        · Resultado: {match.home_score} × {match.away_score}
                      </span>
                    )}
                  </span>
                  {finished ? (
                    <Badge pts={pts} />
                  ) : (
                    <span className="text-xs text-[var(--t3)]">{locked ? 'ao vivo' : 'aberto'}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Badge({ pts }: { pts: number | null }) {
  if (pts == null) return null
  const color =
    pts === 10
      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
      : pts === 7
        ? 'bg-amber-400 text-white'
        : pts === 5
          ? 'bg-[var(--ok)] text-[var(--ok-fg)]'
          : 'bg-[var(--raised)] text-[var(--t3)]'
  return <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${color}`}>{pts} pts</span>
}
