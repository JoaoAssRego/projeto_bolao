import { useMemo } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { buildStandings, withRanks } from '../lib/scoring'

export default function Classificacao() {
  const { participants, matches, predictions } = useStore()
  const { me } = useAuth()

  const ranking = useMemo(
    () => withRanks(buildStandings(participants, matches, predictions)),
    [participants, matches, predictions],
  )

  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 pt-2 text-lg font-bold">Classificação</h1>

      {ranking.length === 0 ? (
        <p className="py-10 text-center text-sm text-emerald-300/50">Ninguém cadastrado ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((r) => (
            <li
              key={r.participant_id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                r.participant_id === me?.id
                  ? 'border-canarinho-yellow/50 bg-canarinho-yellow/10'
                  : 'border-emerald-900/60 bg-emerald-950/40'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  r.rank === 1 ? 'bg-canarinho-yellow text-emerald-950' : 'bg-emerald-900 text-emerald-200'
                }`}
              >
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-emerald-50">
                  {r.name}
                  {r.participant_id === me?.id && <span className="text-emerald-400/60"> (você)</span>}
                </div>
                <div className="text-xs text-emerald-300/60">
                  {r.exacts} cravada{r.exacts === 1 ? '' : 's'} · {r.results} resultado{r.results === 1 ? '' : 's'} ·{' '}
                  {r.played} jogo{r.played === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-white">{r.points}</div>
                <div className="text-[10px] uppercase tracking-wide text-emerald-400/60">pts</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="px-1 pt-2 text-xs text-emerald-300/40">
        Desempate: mais cravadas (10 pts) → mais acertos de resultado (5 pts) → posição compartilhada.
      </p>
    </div>
  )
}
