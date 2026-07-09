import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Match, Participant, Prediction } from '../lib/types'
import { isKnockout, STAGE_LABEL } from '../lib/types'
import { hasResult, isLocked, scoreFor } from '../lib/scoring'
import { formatDate, formatTime } from '../lib/format'
import DrumPicker from './DrumPicker'
import ShareModal from './ShareModal'
import TeamCrest from './TeamCrest'

interface Props {
  match: Match
  me: Participant
  predictions: Prediction[]
  onSave: (home: number, away: number) => Promise<void>
  hasPrediction?: boolean
}

export default function MatchCard({ match, me, predictions, onSave, hasPrediction }: Props) {
  const locked = isLocked(match)
  const finished = hasResult(match)
  const teamsDefined = Boolean(match.home_team && match.away_team)
  const myPred = predictions.find((p) => p.participant_id === me.id)
  const stageLabel = match.label ?? STAGE_LABEL[match.stage]
  const groupLabel = match.leg ? `${stageLabel} · ${match.leg === 'ida' ? 'Ida' : 'Volta'}` : stageLabel
  const warnBorder = !locked && !finished && teamsDefined && !hasPrediction

  const [showShare, setShowShare] = useState(false)
  const pts = finished && myPred != null ? (scoreFor(myPred, match) ?? null) : null
  const shareCardType: 'pre' | 'post' = finished ? 'post' : 'pre'
  const showShareButton =
    (teamsDefined && !locked && (hasPrediction ?? false)) || finished

  return (
    <div className={`rounded-2xl border bg-[var(--surface)] overflow-hidden transition-colors ${warnBorder ? 'border-2 border-yellow-400' : 'border border-[var(--border)]'}`}>
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

      {/* Compact summary + link when locked */}
      {teamsDefined && locked && (
        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            {myPred ? (
              <span className="text-sm font-semibold text-[var(--t1)] tabular-nums">
                Seu palpite: {myPred.home_score} × {myPred.away_score}
              </span>
            ) : (
              <span className="text-sm text-[var(--t3)]">Sem palpite</span>
            )}
            <span className="text-xs text-[var(--t3)]">
              {predictions.length === 1 ? '1 palpite' : `${predictions.length} palpites`}
            </span>
          </div>
          <Link
            to={`/jogo/${match.id}`}
            className="flex-shrink-0 rounded-xl bg-[var(--raised)] px-4 py-2 text-sm font-semibold text-[var(--t2)] transition-colors hover:text-[var(--t1)]"
          >
            Ver Palpites
          </Link>
        </div>
      )}

      {/* Share button */}
      {showShareButton && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <button
            onClick={() => setShowShare(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--raised)] py-2.5 text-sm font-semibold text-[var(--t2)] transition-colors hover:text-[var(--t1)]"
          >
            <span>↗</span>
            Compartilhar
          </button>
        </div>
      )}

      {showShare && (
        <ShareModal
          match={match}
          myPred={myPred}
          pts={pts}
          cardType={shareCardType}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

/* Finished: teams on sides, score in center */
function FinishedRow({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <TeamLabel name={match.home_team} code={match.home_team_code} teamId={match.home_team_id} align="left" />
      <div className="flex flex-col items-center gap-1 px-2">
        <div className="text-3xl font-extrabold text-[var(--t1)] tabular-nums">
          {match.home_score} <span className="text-[var(--t3)] font-light">×</span> {match.away_score}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--t3)]">resultado</div>
      </div>
      <TeamLabel name={match.away_team} code={match.away_team_code} teamId={match.away_team_id} align="right" />
    </div>
  )
}

/* Locked but no result yet: teams on sides, in-progress indicator in center */
function LockedRow({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <TeamLabel name={match.home_team} code={match.home_team_code} teamId={match.home_team_id} align="left" />
      <div className="flex flex-col items-center gap-1.5 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          <span className="text-[11px] uppercase tracking-widest text-red-400 font-bold">ao vivo</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
        </div>
        <span className="text-[10px] text-[var(--t3)]">aguardando placar</span>
      </div>
      <TeamLabel name={match.away_team} code={match.away_team_code} teamId={match.away_team_id} align="right" />
    </div>
  )
}

/* Escudo/bandeira stacked above name, used for non-edit states */
function TeamLabel({
  name,
  code,
  teamId,
  align,
}: {
  name: string | null
  code: string | null
  teamId: number | null
  align: 'left' | 'right'
}) {
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <TeamCrest teamId={teamId} code={code} name={name} size={34} />
      <span className={`text-[13px] font-semibold leading-tight truncate max-w-full ${name ? 'text-[var(--t1)]' : 'italic text-[var(--t3)]'}`}>
        {name ?? 'A definir'}
      </span>
    </div>
  )
}

/* Edit mode: flag + name + drum on each side, inline */
function Editor({ match, initial, onSave }: { match: Match; initial?: Prediction; onSave: (h: number, a: number) => Promise<void> }) {
  const [home, setHome] = useState(initial ? initial.home_score : 0)
  const [away, setAway] = useState(initial ? initial.away_score : 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(!initial)

  const canSave = !saving

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(home, away)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setIsEditing(false)
      }, 1800)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit() {
    setIsEditing(true)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Three-column: [home team] [score] [away team] */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 min-w-0">
          <TeamCrest teamId={match.home_team_id} code={match.home_team_code} name={match.home_team} size={32} />
          <p className="text-[13px] font-semibold text-[var(--t1)] truncate mt-1">{match.home_team}</p>
        </div>

        {/* Score drums — fixed center */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <DrumPicker value={home} onChange={setHome} ariaLabel="gols mandante" disabled={!isEditing} />
          <span className="text-[var(--t3)] text-lg">×</span>
          <DrumPicker value={away} onChange={setAway} ariaLabel="gols visitante" disabled={!isEditing} />
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 text-right">
          <TeamCrest teamId={match.away_team_id} code={match.away_team_code} name={match.away_team} size={32} />
          <p className="text-[13px] font-semibold text-[var(--t1)] truncate mt-1">{match.away_team}</p>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center justify-end gap-3">
        {isEditing ? (
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              saved
                ? 'bg-[var(--ok)] text-[var(--ok-fg)]'
                : 'bg-[var(--accent)] text-[var(--accent-fg)] disabled:bg-[var(--raised)] disabled:text-[var(--t3)]'
            }`}
          >
            {saved ? 'Salvo ✓' : 'Palpitar'}
          </button>
        ) : (
          <button
            onClick={handleEdit}
            className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all bg-[var(--raised)] text-[var(--t2)] hover:text-[var(--t1)]"
          >
            Editar
          </button>
        )}
      </div>
    </div>
  )
}

