import { useState } from 'react'
import type { Match, Participant, Prediction } from '../lib/types'
import { isKnockout, STAGE_LABEL } from '../lib/types'
import { hasResult, isLocked, scoreFor } from '../lib/scoring'
import { formatDate, formatTime } from '../lib/format'
import { getFlag } from '../lib/countryFlags'
import DrumPicker from './DrumPicker'

interface Props {
  match: Match
  me: Participant
  predictions: Prediction[]
  participants: Participant[]
  onSave: (home: number, away: number) => Promise<void>
}

export default function MatchCard({ match, me, predictions, participants, onSave }: Props) {
  const locked = isLocked(match)
  const finished = hasResult(match)
  const teamsDefined = Boolean(match.home_team && match.away_team)
  const myPred = predictions.find((p) => p.participant_id === me.id)
  const groupLabel = match.label ?? STAGE_LABEL[match.stage]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="bg-[var(--raised)] text-[var(--t2)] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
          {groupLabel}
        </span>
        <div className="text-right">
          <div className="text-sm font-semibold text-[var(--t1)]">{formatDate(match.kickoff)}</div>
          <div className="text-xs text-[var(--t2)] mt-0.5">{formatTime(match.kickoff)}</div>
        </div>
      </div>

      {/* Teams + score area */}
      <div className="px-4 pt-4 pb-3">
        {!teamsDefined ? (
          <p className="text-center text-sm text-[var(--t3)] py-3">Confronto ainda não definido.</p>
        ) : finished ? (
          <FinishedRow match={match} />
        ) : !locked ? (
          <Editor key={myPred?.updated_at ?? 'novo'} match={match} initial={myPred} onSave={onSave} />
        ) : (
          <LockedRow match={match} />
        )}
      </div>

      {isKnockout(match.stage) && finished && match.advancer && (
        <p className="text-center text-[11px] text-[var(--accent)] pb-2">
          Avançou: {match.advancer === 'home' ? match.home_team : match.away_team}
        </p>
      )}

      {/* Revealed predictions (locked state) */}
      {teamsDefined && locked && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Revealed match={match} predictions={predictions} participants={participants} meId={me.id} />
        </div>
      )}
    </div>
  )
}

/* Finished: teams on sides, score in center */
function FinishedRow({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <TeamLabel name={match.home_team} align="left" />
      <div className="flex flex-col items-center gap-1 px-2">
        <div className="text-3xl font-extrabold text-[var(--t1)] tabular-nums">
          {match.home_score} <span className="text-[var(--t3)] font-light">×</span> {match.away_score}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--t3)]">resultado</div>
      </div>
      <TeamLabel name={match.away_team} align="right" />
    </div>
  )
}

/* Locked but no result yet: teams on sides, live score in center if available */
function LockedRow({ match }: { match: Match }) {
  const hasLiveScore = match.home_score != null && match.away_score != null

  return (
    <div className="flex items-center justify-between gap-2">
      <TeamLabel name={match.home_team} align="left" />
      <div className="flex flex-col items-center gap-1 px-2">
        {hasLiveScore ? (
          <>
            <div className="text-3xl font-extrabold text-[var(--t1)] tabular-nums">
              {match.home_score} <span className="text-[var(--t3)] font-light">×</span> {match.away_score}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold">ao vivo</span>
            </div>
          </>
        ) : (
          <span className="text-[var(--t3)] text-xl">×</span>
        )}
      </div>
      <TeamLabel name={match.away_team} align="right" />
    </div>
  )
}

/* Flag stacked above name, used for non-edit states */
function TeamLabel({ name, align }: { name: string | null; align: 'left' | 'right' }) {
  const flag = getFlag(name)
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="text-[26px] leading-none">{flag ?? '🏴'}</span>
      <span className={`text-[13px] font-semibold leading-tight truncate max-w-full ${name ? 'text-[var(--t1)]' : 'italic text-[var(--t3)]'}`}>
        {name ?? 'A definir'}
      </span>
    </div>
  )
}

/* Edit mode: flag + name + drum on each side, inline */
function Editor({ match, initial, onSave }: { match: Match; initial?: Prediction; onSave: (h: number, a: number) => Promise<void> }) {
  const [home, setHome] = useState<number | ''>(initial ? initial.home_score : 0)
  const [away, setAway] = useState<number | ''>(initial ? initial.away_score : 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canSave = home !== '' && away !== '' && !saving
  const homeFlag = getFlag(match.home_team)
  const awayFlag = getFlag(match.away_team)

  async function handleSave() {
    if (home === '' || away === '') return
    setSaving(true)
    try {
      await onSave(Number(home), Number(away))
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Three-column: [home team] [score] [away team] */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 min-w-0">
          <span className="text-[24px] leading-none">{homeFlag ?? '🏴'}</span>
          <p className="text-[13px] font-semibold text-[var(--t1)] truncate mt-1">{match.home_team}</p>
        </div>

        {/* Score drums — fixed center */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <DrumPicker value={home} onChange={setHome} ariaLabel="gols mandante" />
          <span className="text-[var(--t3)] text-lg">×</span>
          <DrumPicker value={away} onChange={setAway} ariaLabel="gols visitante" />
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 text-right">
          <span className="text-[24px] leading-none">{awayFlag ?? '🏴'}</span>
          <p className="text-[13px] font-semibold text-[var(--t1)] truncate mt-1">{match.away_team}</p>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center justify-end gap-3">
        {!initial && (
          <span className="text-[10px] text-[var(--t3)] flex items-center gap-1">
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
              <path d="M5 1v12M5 1L2 4M5 1L8 4M5 13L2 10M5 13L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            arraste
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            saved
              ? 'bg-[var(--ok)] text-[var(--ok-fg)]'
              : 'bg-[var(--accent)] text-[var(--accent-fg)] disabled:bg-[var(--raised)] disabled:text-[var(--t3)]'
          }`}
        >
          {saved ? 'Salvo ✓' : initial ? 'Editar' : 'Palpitar'}
        </button>
      </div>
    </div>
  )
}

function Revealed({
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
    return <p className="text-center text-sm text-[var(--t3)]">Ninguém palpitou neste jogo.</p>
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map(({ pred, name, pts }) => (
        <li
          key={pred.id}
          className={`flex items-center justify-between rounded-lg px-2 py-1 ${
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
      : pts === 5
        ? 'bg-[var(--ok)] text-[var(--ok-fg)]'
        : 'bg-[var(--raised)] text-[var(--t3)]'
  return <span className={`w-12 rounded-md px-2 py-0.5 text-center text-xs font-bold ${color}`}>{pts} pts</span>
}
