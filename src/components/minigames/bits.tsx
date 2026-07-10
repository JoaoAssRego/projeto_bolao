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

// ─── Orientação por mando ────────────────────────────────────────────────────────
// O placar interno é SEMPRE [nossos gols, gols do adversário] (scoreIndex 0 e 1).
// A EXIBIÇÃO põe o mandante à esquerda: se jogamos fora ('them'), o adversário vai
// pra esquerda e nós pra direita. Em sede neutra, nós ficamos à esquerda sem rótulo.
interface MatchSide {
  name: string
  code: string
  kind: 'selecao' | 'clube' | 'opponent'
  scoreIndex: 0 | 1
  mando: 'Mandante' | 'Visitante' | null
}

function orientSides(
  home: 'us' | 'them' | 'neutral',
  team: { name: string; code: string; kind: 'selecao' | 'clube' },
  opp: { name: string; code: string },
): [MatchSide, MatchSide] {
  const us: MatchSide = { name: team.name, code: team.code, kind: team.kind, scoreIndex: 0, mando: null }
  const them: MatchSide = { name: opp.name, code: opp.code, kind: 'opponent', scoreIndex: 1, mando: null }
  if (home === 'us') {
    us.mando = 'Mandante'
    them.mando = 'Visitante'
    return [us, them]
  }
  if (home === 'them') {
    them.mando = 'Mandante'
    us.mando = 'Visitante'
    return [them, us]
  }
  return [us, them] // neutral
}

// ─── Contexto do jogo: sede neutra + local ─────────────────────────────────────────
export function MandoContext({ home, venue }: { home: 'us' | 'them' | 'neutral'; venue: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
      {home === 'neutral' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--raised)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--t2)]">
          <span aria-hidden>🏟️</span> Sede neutra
        </span>
      )}
      <span className="text-xs text-[var(--t3)]">
        <span aria-hidden>📍</span> {venue}
      </span>
    </div>
  )
}

// ─── Entrada de placar (dois DrumPickers) ────────────────────────────────────────
// Mandante à esquerda; é o mesmo gesto do palpite do bolão, pra o mini game
// parecer nativo. O `home` decide a ordem — o `value` (placar) nunca muda.
export function ConfrontoScore({
  teamName,
  teamKind,
  teamCode,
  opponent,
  opponentCode,
  home,
  value,
  onChange,
  disabled,
}: {
  teamName: string
  teamKind: 'selecao' | 'clube'
  teamCode: string
  opponent: string
  opponentCode: string
  home: 'us' | 'them' | 'neutral'
  value: MgGuess
  onChange: (v: MgGuess) => void
  disabled?: boolean
}) {
  const [left, right] = orientSides(home, { name: teamName, code: teamCode, kind: teamKind }, { name: opponent, code: opponentCode })
  const setSide = (side: MatchSide, goals: number) => {
    const next: MgGuess = [value[0], value[1]]
    next[side.scoreIndex] = goals
    onChange(next)
  }
  return (
    <div className="flex items-stretch justify-between gap-2">
      <TeamColumn side={left} align="left" />
      <div className="flex flex-shrink-0 items-center gap-1 pt-1">
        <DrumPicker
          value={value[left.scoreIndex]}
          onChange={(v) => setSide(left, v)}
          disabled={disabled}
          ariaLabel={`Gols do ${left.name}`}
        />
        <span className="text-lg font-light text-[var(--t3)]">×</span>
        <DrumPicker
          value={value[right.scoreIndex]}
          onChange={(v) => setSide(right, v)}
          disabled={disabled}
          ariaLabel={`Gols do ${right.name}`}
        />
      </div>
      <TeamColumn side={right} align="right" />
    </div>
  )
}

// ─── Revelação de um jogo (placar real + seu palpite + pontos), orientada ──────────
export function ConfrontoReveal({
  teamName,
  teamKind,
  teamCode,
  opponent,
  opponentCode,
  home,
  actual,
  penalties,
  guess,
  pts,
}: {
  teamName: string
  teamKind: 'selecao' | 'clube'
  teamCode: string
  opponent: string
  opponentCode: string
  home: 'us' | 'them' | 'neutral'
  actual: [number, number]
  penalties: [number, number] | null
  guess: MgGuess
  pts: number
}) {
  const [left, right] = orientSides(home, { name: teamName, code: teamCode, kind: teamKind }, { name: opponent, code: opponentCode })
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-stretch justify-between gap-2">
        <TeamColumn side={left} align="left" />
        <div className="flex flex-shrink-0 flex-col items-center justify-center gap-0.5 pt-1">
          <span className="text-3xl font-extrabold text-[var(--t1)] tabular-nums">
            {actual[left.scoreIndex]}
            <span className="mx-0.5 font-light text-[var(--t3)]">×</span>
            {actual[right.scoreIndex]}
            {penalties && <span className="ml-1 align-top text-[11px] text-[var(--t3)]">(p)</span>}
          </span>
          <span className="text-[11px] text-[var(--t3)] tabular-nums">
            seu palpite: {guess[left.scoreIndex]}×{guess[right.scoreIndex]}
          </span>
        </div>
        <TeamColumn side={right} align="right" />
      </div>
      <MgPointsBadge pts={pts} />
    </div>
  )
}

function TeamColumn({ side, align }: { side: MatchSide; align: 'left' | 'right' }) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 pt-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <MgTeamMark name={side.name} code={side.code} kind={side.kind} size={40} />
      <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight text-[var(--t1)]">
        {side.name}
      </span>
      {side.mando && (
        <span className="text-[10px] uppercase tracking-wider text-[var(--t3)]">{side.mando}</span>
      )}
    </div>
  )
}
