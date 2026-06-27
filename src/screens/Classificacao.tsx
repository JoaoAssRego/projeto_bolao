import { useEffect, useMemo } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { buildStandings, withRanks, computeRankingDelta, getPerfectRoundParticipants } from '../lib/scoring'
import { initTodaySnapshot, loadPreviousSnapshot } from '../lib/rankingSnapshot'

function DeltaBadge({ delta }: { delta: number | undefined }) {
  if (delta == null) return null
  if (delta === 0) return <span className="text-xs font-semibold text-[var(--t3)]">—</span>
  if (delta > 0)
    return (
      <span className="tabular-nums text-xs font-bold text-[oklch(62%_0.18_145)]">↑{delta}</span>
    )
  return (
    <span className="tabular-nums text-xs font-bold text-[oklch(62%_0.22_25)]">↓{Math.abs(delta)}</span>
  )
}

export default function Classificacao() {
  const { participants, matches, predictions, loading } = useStore()
  const { me } = useAuth()

  const ranking = useMemo(
    () => withRanks(buildStandings(participants, matches, predictions)),
    [participants, matches, predictions],
  )

  useEffect(() => {
    if (loading) return
    initTodaySnapshot(ranking)
  }, [loading, ranking])

  const previousSnapshot = useMemo(() => loadPreviousSnapshot(), [])

  const delta = useMemo(
    () => (previousSnapshot ? computeRankingDelta(ranking, previousSnapshot.entries) : new Map<string, number>()),
    [ranking, previousSnapshot],
  )

  const perfectRound = useMemo(
    () => getPerfectRoundParticipants(participants, matches, predictions),
    [participants, matches, predictions],
  )

  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 pt-2 text-lg font-bold text-[var(--t1)]">Classificação</h1>

      {ranking.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--t3)]">Ninguém cadastrado ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((r) => (
            <li
              key={r.participant_id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                r.participant_id === me?.id
                  ? 'border-[var(--accent-ring)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    r.rank === 1
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--raised)] text-[var(--t2)]'
                  }`}
                >
                  {r.rank}
                </span>
                <DeltaBadge delta={delta.get(r.participant_id)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[var(--t1)]">
                  {r.name}
                  {r.participant_id === me?.id && <span className="text-[var(--t3)]"> (você)</span>}
                  {perfectRound.has(r.participant_id) && (
                    <span className="ml-1 text-xs" title="Rodada perfeita">🔥</span>
                  )}
                </div>
                <div className="text-xs text-[var(--t3)]">
                  {r.exacts} cravada{r.exacts === 1 ? '' : 's'} · {r.margins} saldo{r.margins === 1 ? '' : 's'} · {r.results} resultado{r.results === 1 ? '' : 's'} ·{' '}
                  {r.played} jogo{r.played === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-[var(--t1)]">{r.points}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--t3)]">pts</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="px-1 pt-2 text-xs text-[var(--t3)]">
        Desempate: mais cravadas (10 pts) → mais saldos certos (7 pts) → mais acertos de resultado (5 pts) → posição compartilhada.
      </p>
    </div>
  )
}
