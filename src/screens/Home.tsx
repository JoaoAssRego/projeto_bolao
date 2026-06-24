import { useMemo } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { buildStandings, withRanks, isLocked, hasResult } from '../lib/scoring'

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
})

const shortDateFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  day: 'numeric',
})

export default function Home() {
  const { participants, matches, predictions } = useStore()
  const { me } = useAuth()

  const ranking = useMemo(
    () => withRanks(buildStandings(participants, matches, predictions)),
    [participants, matches, predictions],
  )

  const liveMatches = useMemo(
    () => matches.filter((m) => isLocked(m) && !hasResult(m)),
    [matches],
  )

  const nextMatches = useMemo(
    () =>
      matches
        .filter((m) => !isLocked(m) && m.home_team && m.away_team)
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        .slice(0, 3),
    [matches],
  )

  const leaderPoints = ranking[0]?.points ?? 0
  const myRow = ranking.find((r) => r.participant_id === me?.id)

  if (!me) return null

  return (
    <div className="flex flex-col gap-4 pt-1">
      {liveMatches.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[oklch(63%_0.257_29_/_0.45)] bg-[oklch(63%_0.257_29_/_0.1)] px-4 py-3">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[oklch(63%_0.257_29)]" />
          <span className="text-sm font-semibold text-[oklch(70%_0.200_29)]">
            {liveMatches.length === 1
              ? `${liveMatches[0].home_team} × ${liveMatches[0].away_team} — ao vivo`
              : `${liveMatches.length} jogos ao vivo agora`}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1 pt-1">
          <h1 className="text-lg font-bold text-[var(--t1)]">Classificação</h1>
          {myRow && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                myRow.rank === 1 ? 'text-[var(--accent)]' : 'text-[var(--t3)]'
              }`}
            >
              {myRow.rank === 1
                ? 'Você lidera'
                : `−${leaderPoints - myRow.points} pts do 1°`}
            </span>
          )}
        </div>

        {ranking.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--t3)]">Nenhum participante ainda.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranking.map((r) => {
              const isMe = r.participant_id === me.id
              return (
                <li
                  key={r.participant_id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                    isMe
                      ? 'border-[var(--accent-ring)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      r.rank === 1
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--raised)] text-[var(--t2)]'
                    }`}
                  >
                    {r.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[var(--t1)]">
                      {r.name}
                      {isMe && <span className="text-[var(--t3)]"> (você)</span>}
                    </div>
                    <div className="text-xs text-[var(--t3)]">
                      {r.exacts} cravada{r.exacts === 1 ? '' : 's'} · {r.results} resultado{r.results === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold tabular-nums text-[var(--t1)]">{r.points}</div>
                    <div className="text-[10px] uppercase tracking-wide text-[var(--t3)]">pts</div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <p className="px-1 pt-1 text-xs text-[var(--t3)]">
          Desempate: mais cravadas → mais acertos → posição compartilhada.
        </p>
      </div>

      {nextMatches.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--t3)]">
            Próximos jogos
          </h2>
          <div className="flex flex-col gap-1.5">
            {nextMatches.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="flex-1 text-sm font-medium text-[var(--t1)]">
                  {m.home_team} × {m.away_team}
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold tabular-nums text-[var(--t2)]">
                    {timeFmt.format(new Date(m.kickoff))}
                  </div>
                  <div className="text-[10px] text-[var(--t3)]">
                    {shortDateFmt.format(new Date(m.kickoff)).replace('.', '')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
