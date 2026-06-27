import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { buildStandings, withRanks, isLocked, hasResult, computeRankingDelta, getPerfectRoundParticipants } from '../lib/scoring'
import { initTodaySnapshot, loadPreviousSnapshot } from '../lib/rankingSnapshot'

const LAST_LEAGUE_KEY = 'bolao.lastLeagueId'

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

export default function Home() {
  const { participants, matches, predictions, loading, leagues, leagueMembers } = useStore()
  const { me } = useAuth()
  const navigate = useNavigate()

  // Liga ativa: lê do localStorage no mount, valida que o usuário ainda é membro aceito
  const [savedLeagueId] = useState(() => localStorage.getItem(LAST_LEAGUE_KEY))

  const currentLeague = useMemo(() => {
    if (!savedLeagueId || !me) return null
    const isMember = leagueMembers.some(
      (m) => m.league_id === savedLeagueId && m.participant_id === me.id && m.status === 'accepted',
    )
    if (!isMember) return null
    return leagues.find((l) => l.id === savedLeagueId) ?? null
  }, [savedLeagueId, me, leagueMembers, leagues])

  // Liga inválida (removido ou deletada) → limpa o storage
  useEffect(() => {
    if (savedLeagueId && !currentLeague && !loading) {
      localStorage.removeItem(LAST_LEAGUE_KEY)
    }
  }, [savedLeagueId, currentLeague, loading])

  const filteredParticipants = useMemo(() => {
    if (!currentLeague) return participants
    const memberIds = new Set(
      leagueMembers
        .filter((m) => m.league_id === currentLeague.id && m.status === 'accepted')
        .map((m) => m.participant_id),
    )
    return participants.filter((p) => memberIds.has(p.id))
  }, [currentLeague, participants, leagueMembers])

  const ranking = useMemo(
    () => withRanks(buildStandings(filteredParticipants, matches, predictions, currentLeague?.created_at)),
    [filteredParticipants, matches, predictions, currentLeague],
  )

  // Snapshot e delta apenas no modo global (snapshot salvo é sempre do ranking global)
  useEffect(() => {
    if (loading || currentLeague) return
    initTodaySnapshot(ranking)
  }, [loading, ranking, currentLeague])

  const previousSnapshot = useMemo(() => (currentLeague ? null : loadPreviousSnapshot()), [currentLeague])

  const delta = useMemo(
    () => (previousSnapshot ? computeRankingDelta(ranking, previousSnapshot.entries) : new Map<string, number>()),
    [ranking, previousSnapshot],
  )

  const perfectRound = useMemo(
    () => getPerfectRoundParticipants(filteredParticipants, matches, predictions),
    [filteredParticipants, matches, predictions],
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
  const myIndex = ranking.findIndex((r) => r.participant_id === me?.id)
  const myRow = myIndex >= 0 ? ranking[myIndex] : undefined

  // Janela enxuta: eu no centro, com quem está logo acima e logo abaixo.
  // Nas pontas (líder ou lanterna) a janela desliza pra manter 3 linhas.
  const windowRows = useMemo(() => {
    if (myIndex < 0) return ranking.slice(0, 3)
    const start = Math.min(Math.max(myIndex - 1, 0), Math.max(0, ranking.length - 3))
    return ranking.slice(start, start + 3)
  }, [ranking, myIndex])

  const above = myIndex > 0 ? ranking[myIndex - 1] : undefined
  const below = myIndex >= 0 && myIndex < ranking.length - 1 ? ranking[myIndex + 1] : undefined
  const toPass = above && myRow ? above.points - myRow.points : null
  const cushion = below && myRow ? myRow.points - below.points : null

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
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-bold text-[var(--t1)]">Classificação</h1>
            {currentLeague && (
              <button
                onClick={() => navigate('/ligas')}
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] active:opacity-70"
              >
                {currentLeague.name} <span className="text-[var(--t3)]">↗</span>
              </button>
            )}
          </div>
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

        {myRow && (toPass != null || cushion != null) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--t3)]">Para subir</div>
              {toPass == null ? (
                <div className="mt-0.5 text-sm font-bold text-[var(--accent)]">No topo</div>
              ) : toPass === 0 ? (
                <div className="mt-0.5 text-sm font-semibold text-[var(--t1)]">
                  Empate no {above!.rank}° — desempate
                </div>
              ) : (
                <div className="mt-0.5 text-sm font-semibold text-[var(--t1)]">
                  <span className="text-base font-extrabold tabular-nums">{toPass}</span> pts p/ o {above!.rank}°
                </div>
              )}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--t3)]">Para manter</div>
              {cushion == null ? (
                <div className="mt-0.5 text-sm font-semibold text-[var(--t2)]">Sem ninguém atrás</div>
              ) : cushion === 0 ? (
                <div className="mt-0.5 text-sm font-semibold text-[var(--t1)]">
                  Empate no {below!.rank}° — desempate
                </div>
              ) : (
                <div className="mt-0.5 text-sm font-semibold text-[var(--t1)]">
                  <span className="text-base font-extrabold tabular-nums">{cushion}</span> pts sobre o {below!.rank}°
                </div>
              )}
            </div>
          </div>
        )}

        {ranking.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--t3)]">Nenhum participante ainda.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {windowRows.map((r) => {
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
                      {isMe && <span className="text-[var(--t3)]"> (você)</span>}
                      {perfectRound.has(r.participant_id) && (
                        <span className="ml-1 text-xs" title="Rodada perfeita">🔥</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--t3)]">
                      {r.exacts} cravada{r.exacts === 1 ? '' : 's'} · {r.margins} saldo{r.margins === 1 ? '' : 's'} · {r.results} resultado{r.results === 1 ? '' : 's'}
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
          Desempate: mais cravadas (10 pts) → mais saldos certos (7 pts) → mais acertos de resultado (5 pts) → posição compartilhada.
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
