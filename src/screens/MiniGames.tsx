import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../data/auth'
import { CAMPAIGNS, groupByTeam } from '../lib/minigames/campaigns'
import type { TeamGroup } from '../lib/minigames/campaigns'
import { COMPETITION_LABEL } from '../lib/minigames/types'
import type { MgCampaign, MgGuess } from '../lib/minigames/types'
import { scoreGuess } from '../lib/minigames/scoring'
import { brtToday, brtYesterday, dailyChallenge } from '../lib/minigames/daily'
import { loadState, recordDaily } from '../lib/minigames/storage'
import type { MgState } from '../lib/minigames/storage'
import type { MgPathMatch } from '../lib/minigames/types'
import { ConfrontoReveal, ConfrontoScore, MandoContext, MgTeamMark, StreakPill } from '../components/minigames/bits'

// Aba "Games" — jogo histórico "Refaça a Glória". Ponto de partida: desafio do
// dia (gancho de hábito) + escolha de uma campanha campeã pra refazer o trajeto.
export default function MiniGames() {
  const { me } = useAuth()
  const [state, setState] = useState<MgState>(() => (me ? loadState(me.id) : loadState('anon')))

  if (!me) return null

  const today = brtToday()
  const completedCount = Object.keys(state.results).length

  return (
    <div className="flex flex-col gap-5 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--t1)]">Games</h1>
          <p className="text-xs text-[var(--t3)]">Refaça o trajeto dos campeões</p>
        </div>
        <StreakPill days={state.daily.streak} />
      </header>

      <DailyChallengeCard meId={me.id} state={state} today={today} onPlayed={setState} />

      <CampaignPicker state={state} completedCount={completedCount} />
    </div>
  )
}

// ─── Desafio do dia ──────────────────────────────────────────────────────────
function DailyChallengeCard({
  meId,
  state,
  today,
  onPlayed,
}: {
  meId: string
  state: MgState
  today: string
  onPlayed: (s: MgState) => void
}) {
  const challenge = useMemo(() => dailyChallenge(CAMPAIGNS, today), [today])
  const played = state.daily.history[today]
  const [guess, setGuess] = useState<MgGuess>([0, 0])

  if (!challenge) return null
  const { campaign, match } = challenge

  function submit() {
    if (!challenge) return
    const pts = scoreGuess(guess, match.score)
    const next = recordDaily(meId, today, brtYesterday(), {
      campaignId: campaign.id,
      matchIndex: challenge.matchIndex,
      guess,
      points: pts,
    })
    onPlayed(next)
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
          Desafio do dia
        </span>
        <span className="text-[11px] uppercase tracking-widest text-[var(--t3)]">
          {COMPETITION_LABEL[campaign.competition]} {campaign.year}
        </span>
      </div>

      {played ? (
        <DailyDone campaign={campaign} match={match} guess={played.guess} pts={played.points} streak={state.daily.streak} />
      ) : (
        <>
          <p className="mb-2 text-center text-sm text-[var(--t2)]">
            {campaign.team} · {match.leg ? `${match.stageLabel} · ${match.leg === 'ida' ? 'Ida' : 'Volta'}` : match.stageLabel}. Qual foi o placar?
          </p>
          <div className="mb-4">
            <MandoContext home={match.home} venue={match.venue} />
          </div>
          <ConfrontoScore
            teamName={campaign.team}
            teamKind={campaign.teamKind}
            teamCode={campaign.teamCountryCode}
            opponent={match.opponent}
            opponentCode={match.opponentCountryCode}
            home={match.home}
            value={guess}
            onChange={setGuess}
          />
          <button
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
          >
            Responder
          </button>
        </>
      )}
    </section>
  )
}

function DailyDone({
  campaign,
  match,
  guess,
  pts,
  streak,
}: {
  campaign: MgCampaign
  match: MgPathMatch
  guess: MgGuess
  pts: number
  streak: number
}) {
  return (
    <div className="flex flex-col gap-3">
      <MandoContext home={match.home} venue={match.venue} />
      <ConfrontoReveal
        teamName={campaign.team}
        teamKind={campaign.teamKind}
        teamCode={campaign.teamCountryCode}
        opponent={match.opponent}
        opponentCode={match.opponentCountryCode}
        home={match.home}
        actual={match.score}
        penalties={match.penalties}
        guess={guess}
        pts={pts}
      />
      <p className="text-center text-xs text-[var(--t3)]">
        Volte amanhã{streak > 0 && ` · ofensiva de ${streak} ${streak === 1 ? 'dia' : 'dias'} 🔥`}
      </p>
    </div>
  )
}

// ─── Seleção de campanhas ─────────────────────────────────────────────────────
function CampaignPicker({ state, completedCount }: { state: MgState; completedCount: number }) {
  const groups = useMemo(() => groupByTeam(), [])

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-base font-bold text-[var(--t1)]">Escolha uma campanha</h2>
        {completedCount > 0 && (
          <span className="text-xs text-[var(--t3)] tabular-nums">{completedCount} refeita{completedCount === 1 ? '' : 's'}</span>
        )}
      </div>
      <p className="px-1 text-xs text-[var(--t3)]">
        Refaça o trajeto do campeão: acerte os placares e o artilheiro.
      </p>
      <div className="mt-1 flex flex-col gap-2">
        {groups.map((g) => (
          <TeamRow key={g.team} group={g} state={state} />
        ))}
      </div>
    </section>
  )
}

function TeamRow({ group, state }: { group: TeamGroup; state: MgState }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const multi = group.campaigns.length > 1

  function pick(c: MgCampaign) {
    navigate(`/games/campanha/${c.id}`)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <button
        onClick={() => (multi ? setOpen((o) => !o) : pick(group.campaigns[0]))}
        aria-expanded={multi ? open : undefined}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[var(--raised)]"
      >
        <MgTeamMark name={group.team} code={group.teamCountryCode} kind={group.teamKind} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[var(--t1)]">{group.team}</p>
          <p className="truncate text-xs text-[var(--t3)]">
            {group.teamKind === 'selecao' ? 'Copa do Mundo' : 'Libertadores'} · {group.titles} {group.titles === 1 ? 'título' : 'títulos'}
          </p>
        </div>
        {multi ? (
          <svg
            className={`text-[var(--t3)] transition-transform ${open ? 'rotate-180' : ''}`}
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : (
          <ChampBadge campaign={group.campaigns[0]} state={state} />
        )}
      </button>

      {multi && open && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          {group.campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c)}
              className="flex items-center gap-2 rounded-full bg-[var(--bg)] px-3.5 py-2 text-sm font-bold text-[var(--t1)] transition-colors active:bg-[var(--raised)]"
            >
              <span className="tabular-nums">{c.year}</span>
              <ChampBadge campaign={c} state={state} small />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Marca de "já refez" com a melhor pontuação, se houver.
function ChampBadge({ campaign, state, small }: { campaign: MgCampaign; state: MgState; small?: boolean }) {
  const r = state.results[campaign.id]
  if (!r) return null
  const perfect = r.bestTotal === r.max
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
        perfect ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-[var(--raised)] text-[var(--t2)]'
      }`}
      title={`Melhor: ${r.bestTotal}/${r.max}`}
    >
      {perfect ? '🏆' : '✓'} {small ? r.bestTotal : `${r.bestTotal}/${r.max}`}
    </span>
  )
}
