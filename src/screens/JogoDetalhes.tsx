import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import type { Match, Prediction, Participant, League, LeagueMember } from '../lib/types'
import { isKnockout, STAGE_LABEL } from '../lib/types'
import { hasResult, scoreFor } from '../lib/scoring'
import { formatDate, formatTime } from '../lib/format'
import { getFlag } from '../lib/countryFlags'
import RulesModal from '../components/RulesModal'

export default function JogoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { me } = useAuth()
  const { matches, predictions, participants, leagues, leagueMembers } = useStore()
  const [showRules, setShowRules] = useState(false)

  const match = matches.find((m) => m.id === id)

  if (!match || !me) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-[var(--t3)]">Jogo não encontrado.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--accent)]">Voltar</button>
      </div>
    )
  }

  const matchPredictions = predictions.filter((p) => p.match_id === match.id)

  const myLeagues = leagues.filter((lg) =>
    leagueMembers.some(
      (m) => m.league_id === lg.id && m.participant_id === me.id && m.status === 'accepted',
    ),
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Back header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--raised)] text-[var(--t2)] transition-colors active:bg-[var(--border)]"
            aria-label="Voltar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[var(--t2)]">Detalhes do Jogo</span>
        </div>
        <button
          onClick={() => setShowRules(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--raised)] text-[var(--t2)] transition-colors hover:text-[var(--t1)] active:bg-[var(--border)]"
          aria-label="Regras de Pontuação"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
      </div>

      {/* Match info card */}
      <MatchInfo match={match} />

      {/* Tabs + predictions */}
      <PredictionSection
        match={match}
        predictions={matchPredictions}
        participants={participants}
        meId={me.id}
        leagues={myLeagues}
        leagueMembers={leagueMembers}
      />

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}
    </div>
  )
}

function MatchInfo({ match }: { match: Match }) {
  const finished = hasResult(match)
  const teamsDefined = Boolean(match.home_team && match.away_team)
  const groupLabel = match.label ?? STAGE_LABEL[match.stage]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="bg-[var(--raised)] text-[var(--t2)] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
          {groupLabel}
        </span>
        <div className="text-right">
          <div className="text-sm font-semibold text-[var(--t1)]">{formatDate(match.kickoff)}</div>
          <div className="text-xs text-[var(--t2)] mt-0.5">{formatTime(match.kickoff)}</div>
        </div>
      </div>

      <div className="px-4 py-4">
        {!teamsDefined ? (
          <p className="text-center text-sm text-[var(--t3)] py-3">Confronto ainda não definido.</p>
        ) : finished ? (
          <FinishedRow match={match} />
        ) : (
          <LockedRow match={match} />
        )}
      </div>

      {isKnockout(match.stage) && finished && match.advancer && (
        <p className="text-center text-[11px] text-[var(--accent)] pb-3">
          Avançou: {match.advancer === 'home' ? match.home_team : match.away_team}
        </p>
      )}
    </div>
  )
}

function FinishedRow({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <TeamLabel name={match.home_team} code={match.home_team_code} align="left" />
      <div className="flex flex-col items-center gap-1 px-2">
        <div className="text-3xl font-extrabold text-[var(--t1)] tabular-nums">
          {match.home_score} <span className="text-[var(--t3)] font-light">×</span> {match.away_score}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--t3)]">resultado</div>
      </div>
      <TeamLabel name={match.away_team} code={match.away_team_code} align="right" />
    </div>
  )
}

function LockedRow({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <TeamLabel name={match.home_team} code={match.home_team_code} align="left" />
      <div className="flex flex-col items-center gap-1.5 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          <span className="text-[11px] uppercase tracking-widest text-red-400 font-bold">ao vivo</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
        </div>
        <span className="text-[10px] text-[var(--t3)]">aguardando placar</span>
      </div>
      <TeamLabel name={match.away_team} code={match.away_team_code} align="right" />
    </div>
  )
}

function TeamLabel({ name, code, align }: { name: string | null; code: string | null; align: 'left' | 'right' }) {
  const flag = getFlag(code, name)
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="text-[26px] leading-none">{flag ?? '🏴'}</span>
      <span className={`text-[13px] font-semibold leading-tight truncate max-w-full ${name ? 'text-[var(--t1)]' : 'italic text-[var(--t3)]'}`}>
        {name ?? 'A definir'}
      </span>
    </div>
  )
}

function PredictionSection({
  match,
  predictions,
  participants,
  meId,
  leagues,
  leagueMembers,
}: {
  match: Match
  predictions: Prediction[]
  participants: Participant[]
  meId: string
  leagues: League[]
  leagueMembers: LeagueMember[]
}) {
  const [activeTab, setActiveTab] = useState<'global' | string>('global')

  const filteredPredictions =
    activeTab === 'global'
      ? predictions
      : predictions.filter((p) =>
          leagueMembers.some(
            (m) => m.league_id === activeTab && m.participant_id === p.participant_id && m.status === 'accepted',
          ),
        )

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <TabButton active={activeTab === 'global'} onClick={() => setActiveTab('global')}>
          Global
        </TabButton>
        {leagues.map((lg) => (
          <TabButton key={lg.id} active={activeTab === lg.id} onClick={() => setActiveTab(lg.id)}>
            {lg.name}
          </TabButton>
        ))}
      </div>

      {/* Prediction list */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <PredictionList
          match={match}
          predictions={filteredPredictions}
          participants={participants}
          meId={meId}
        />
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'bg-[var(--raised)] text-[var(--t2)] hover:text-[var(--t1)]'
      }`}
    >
      {children}
    </button>
  )
}

function PredictionList({
  match,
  predictions,
  participants,
  meId,
}: {
  match: Match
  predictions: Prediction[]
  participants: Participant[]
  meId: string
}) {
  const byId = new Map(participants.map((p) => [p.id, p.name]))
  const rows = predictions
    .map((p) => ({ pred: p, name: byId.get(p.participant_id) ?? '—', pts: scoreFor(p, match) }))
    .sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0) || a.name.localeCompare(b.name))

  if (rows.length === 0) {
    return <p className="text-center text-sm text-[var(--t3)] py-4">Nenhum palpite nesta visão.</p>
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map(({ pred, name, pts }) => (
        <li
          key={pred.id}
          className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
            pred.participant_id === meId ? 'bg-[var(--raised)]' : ''
          }`}
        >
          <span className="text-[var(--t1)]">
            {name}
            {pred.participant_id === meId && <span className="text-[var(--t3)]"> (você)</span>}
          </span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums text-[var(--t2)]">
              {pred.home_score} × {pred.away_score}
            </span>
            <PointsBadge pts={pts} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function PointsBadge({ pts }: { pts: number | null }) {
  if (pts == null) return <span className="text-xs text-[var(--t3)]">aguardando</span>
  const color =
    pts === 10
      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
      : pts === 7
        ? 'bg-amber-400 text-white'
        : pts === 5
          ? 'bg-[var(--ok)] text-[var(--ok-fg)]'
          : 'bg-[var(--raised)] text-[var(--t3)]'
  return <span className={`w-12 rounded-md px-2 py-0.5 text-center text-xs font-bold ${color}`}>{pts} pts</span>
}
