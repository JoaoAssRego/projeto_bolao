import { getFlag } from '../../lib/countryFlags'
import DrumPicker from '../DrumPicker'
import TeamCrest from '../TeamCrest'
import { crestIdFor } from '../../lib/minigames/crestIds'
import type { MgGuess } from '../../lib/minigames/types'

// ─── Marca do time ─────────────────────────────────────────────────────────────
// Seleções e adversários usam a bandeira do país (emoji, coerente com o resto do
// app). O nosso time-clube usa um monograma: mostrar 🇧🇷 pra Flamengo/Vasco/etc.
// não identificaria nada. Escudo real de clube depende de team_id da BSD, que não
// existe pra campanhas históricas — então monograma é o fallback honesto.

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function MgTeamMark({
  name,
  code,
  kind,
  size,
}: {
  name: string
  code: string | null | undefined
  kind: 'selecao' | 'clube' | 'opponent'
  size: number
}) {
  // Escudo real da BSD quando existe (clubes); TeamCrest cai na bandeira do país
  // sozinho se a imagem falhar. Sem escudo + clube → monograma.
  const teamId = crestIdFor(name)
  if (teamId != null) {
    return <TeamCrest teamId={teamId} code={code} name={name} size={size} />
  }
  if (kind === 'clube') {
    return (
      <span
        aria-hidden
        className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--raised)] font-extrabold text-[var(--t1)]"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        {initials(name)}
      </span>
    )
  }
  const flag = getFlag(code, name)
  return (
    <span
      aria-hidden
      className="inline-flex flex-shrink-0 items-center justify-center leading-none"
      style={{ width: size, height: size, fontSize: size * 0.86 }}
    >
      {flag ?? '🏴'}
    </span>
  )
}

// ─── Badge de pontos ────────────────────────────────────────────────────────────
// Mesma escala do bolão: 10 (amarelo) / 7 / 5 (verde) / 0 (mudo).
export function MgPointsBadge({ pts }: { pts: number }) {
  const color =
    pts === 10
      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
      : pts === 7
        ? 'bg-[oklch(75%_0.16_120)] text-[var(--accent-fg)]'
        : pts === 5
          ? 'bg-[var(--ok)] text-[var(--ok-fg)]'
          : 'bg-[var(--raised)] text-[var(--t3)]'
  return (
    <span className={`w-12 rounded-md px-2 py-0.5 text-center text-xs font-bold tabular-nums ${color}`}>
      {pts} pts
    </span>
  )
}

// ─── Pílula de ofensiva ──────────────────────────────────────────────────────────
export function StreakPill({ days }: { days: number }) {
  if (days <= 0) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--raised)] px-2.5 py-1 text-xs font-bold text-[var(--t1)]">
      <span aria-hidden>🔥</span>
      <span className="tabular-nums">{days}</span>
      <span className="font-semibold text-[var(--t3)]">{days === 1 ? 'dia' : 'dias'}</span>
    </span>
  )
}

// ─── Entrada de placar (dois DrumPickers) ────────────────────────────────────────
// Nosso time à esquerda, adversário à direita. É o mesmo gesto do palpite do
// bolão, pra o mini game parecer nativo.
export function ConfrontoScore({
  teamName,
  teamKind,
  teamCode,
  opponent,
  opponentCode,
  value,
  onChange,
  disabled,
}: {
  teamName: string
  teamKind: 'selecao' | 'clube'
  teamCode: string
  opponent: string
  opponentCode: string
  value: MgGuess
  onChange: (v: MgGuess) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-stretch justify-between gap-2">
      <TeamColumn name={teamName} code={teamCode} kind={teamKind} align="left" />
      <div className="flex flex-shrink-0 items-center gap-1 pt-1">
        <DrumPicker
          value={value[0]}
          onChange={(v) => onChange([v, value[1]])}
          disabled={disabled}
          ariaLabel={`Gols do ${teamName}`}
        />
        <span className="text-lg font-light text-[var(--t3)]">×</span>
        <DrumPicker
          value={value[1]}
          onChange={(v) => onChange([value[0], v])}
          disabled={disabled}
          ariaLabel={`Gols do ${opponent}`}
        />
      </div>
      <TeamColumn name={opponent} code={opponentCode} kind="opponent" align="right" />
    </div>
  )
}

function TeamColumn({
  name,
  code,
  kind,
  align,
}: {
  name: string
  code: string
  kind: 'selecao' | 'clube' | 'opponent'
  align: 'left' | 'right'
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 pt-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <MgTeamMark name={name} code={code} kind={kind} size={40} />
      <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight text-[var(--t1)]">
        {name}
      </span>
    </div>
  )
}
