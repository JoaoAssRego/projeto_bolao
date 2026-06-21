import { useState } from 'react'
import type { Match, Participant, Prediction } from '../lib/types'
import { isKnockout } from '../lib/types'
import { hasResult, isLocked, scoreFor } from '../lib/scoring'
import { formatKickoff } from '../lib/format'
import ScoreStepper from './ScoreStepper'

interface Props {
  match: Match
  me: Participant
  predictions: Prediction[] // todos os palpites deste jogo
  participants: Participant[]
  onSave: (home: number, away: number) => Promise<void>
}

export default function MatchCard({ match, me, predictions, participants, onSave }: Props) {
  const locked = isLocked(match)
  const finished = hasResult(match)
  const teamsDefined = Boolean(match.home_team && match.away_team)
  const myPred = predictions.find((p) => p.participant_id === me.id)

  return (
    <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-emerald-300/60">
        <span>{match.label ?? ''}</span>
        <span>{formatKickoff(match.kickoff)}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <TeamLabel name={match.home_team} align="left" />
        {finished ? (
          <div className="px-2 text-center">
            <div className="text-xl font-extrabold text-white">
              {match.home_score} <span className="text-emerald-500">×</span> {match.away_score}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-emerald-400/70">
              {match.result_source === 'api' ? '🔄 resultado' : 'resultado'}
            </div>
          </div>
        ) : (
          <span className="px-2 text-emerald-600">×</span>
        )}
        <TeamLabel name={match.away_team} align="right" />
      </div>

      {isKnockout(match.stage) && finished && match.advancer && (
        <p className="mt-1 text-center text-[11px] text-canarinho-yellow/80">
          Avançou: {match.advancer === 'home' ? match.home_team : match.away_team}
        </p>
      )}

      <div className="mt-3 border-t border-emerald-900/50 pt-3">
        {!teamsDefined ? (
          <p className="text-center text-sm text-emerald-300/60">Confronto ainda não definido.</p>
        ) : !locked ? (
          <Editor key={myPred?.updated_at ?? 'novo'} initial={myPred} onSave={onSave} />
        ) : (
          <Revealed match={match} predictions={predictions} participants={participants} meId={me.id} />
        )}
      </div>
    </div>
  )
}

function TeamLabel({ name, align }: { name: string | null; align: 'left' | 'right' }) {
  return (
    <div className={`flex-1 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <span className={`font-semibold ${name ? 'text-white' : 'italic text-emerald-400/50'}`}>
        {name ?? 'A definir'}
      </span>
    </div>
  )
}

function Editor({ initial, onSave }: { initial?: Prediction; onSave: (h: number, a: number) => Promise<void> }) {
  const [home, setHome] = useState<number | ''>(initial ? initial.home_score : '')
  const [away, setAway] = useState<number | ''>(initial ? initial.away_score : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canSave = home !== '' && away !== '' && !saving

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
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <ScoreStepper value={home} onChange={setHome} ariaLabel="gols mandante" />
        <span className="text-emerald-600">×</span>
        <ScoreStepper value={away} onChange={setAway} ariaLabel="gols visitante" />
      </div>
      <button
        onClick={handleSave}
        disabled={!canSave}
        className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
          saved
            ? 'bg-canarinho-green text-white'
            : 'bg-canarinho-yellow text-emerald-950 disabled:opacity-40'
        }`}
      >
        {saved ? 'Salvo ✓' : initial ? 'Editar' : 'Palpitar'}
      </button>
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
    return <p className="text-center text-sm text-emerald-300/50">Ninguém palpitou neste jogo.</p>
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map(({ pred, name, pts }) => (
        <li
          key={pred.id}
          className={`flex items-center justify-between rounded-lg px-2 py-1 ${
            pred.participant_id === meId ? 'bg-emerald-900/50' : ''
          }`}
        >
          <span className="text-emerald-100/90">
            {name}
            {pred.participant_id === meId && <span className="text-emerald-400/60"> (você)</span>}
          </span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums text-emerald-200/80">
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
  if (pts == null) return <span className="text-xs text-emerald-300/40">aguardando</span>
  const color =
    pts === 10 ? 'bg-canarinho-yellow text-emerald-950' : pts === 5 ? 'bg-canarinho-green text-white' : 'bg-emerald-950 text-emerald-400/60'
  return <span className={`w-12 rounded-md px-2 py-0.5 text-center text-xs font-bold ${color}`}>{pts} pts</span>
}
