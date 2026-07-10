import { useEffect, useState } from 'react'
import {
  fetchCampaignLeaderboard,
  fetchDailyLeaderboard,
  type CampaignRankRow,
  type DailyRange,
  type DailyRankRow,
} from '../../lib/minigames/leaderboard'

// Sheet modal de classificação do Mini Games. Overlay simples (sem lib): backdrop
// + cartão que sobe de baixo, no espírito mobile do app. Usado pelo desafio do dia
// (com recorte semana/mês/total) e pela tela de resultado de campanha.

function medal(pos: number): string {
  return pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}`
}

function SheetShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[var(--border)] bg-[var(--bg)] px-4 pb-8 pt-3 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden />
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--t1)]">{title}</h2>
            {subtitle && <p className="truncate text-xs text-[var(--t3)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--raised)] text-[var(--t2)] active:bg-[var(--border)]"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function RankRow({
  pos,
  name,
  isMe,
  value,
  detail,
}: {
  pos: number
  name: string
  isMe: boolean
  value: string
  detail?: string
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        isMe ? 'bg-[var(--accent-muted)] ring-1 ring-[var(--accent-ring)]' : ''
      }`}
    >
      <span className="w-7 flex-shrink-0 text-center text-sm font-bold tabular-nums text-[var(--t2)]">
        {medal(pos)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--t1)]">
          {name}
          {isMe && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">você</span>}
        </p>
        {detail && <p className="truncate text-[11px] text-[var(--t3)]">{detail}</p>}
      </div>
      <span className="flex-shrink-0 text-sm font-extrabold tabular-nums text-[var(--t1)]">{value}</span>
    </div>
  )
}

function StateHint({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-[var(--t3)]">{text}</p>
}

// ─── Classificação do desafio do dia (semana / mês / total) ─────────────────────
const RANGES: { key: DailyRange; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'total', label: 'Total' },
]

export function DailyLeaderboardSheet({ meId, onClose }: { meId: string; onClose: () => void }) {
  const [range, setRange] = useState<DailyRange>('week')
  const [rows, setRows] = useState<DailyRankRow[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setRows(null)
    setError(false)
    fetchDailyLeaderboard(range)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [range])

  return (
    <SheetShell title="Classificação diária" subtitle="Pontos acumulados no desafio do dia" onClose={onClose}>
      <div className="mb-3 flex gap-1 rounded-xl bg-[var(--surface)] p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
              range === r.key ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--t2)] active:bg-[var(--raised)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error ? (
        <StateHint text="Não foi possível carregar a classificação." />
      ) : rows == null ? (
        <StateHint text="Carregando…" />
      ) : rows.length === 0 ? (
        <StateHint text="Ninguém pontuou neste período ainda." />
      ) : (
        <div className="flex flex-col gap-0.5">
          {rows.map((r, i) => (
            <RankRow
              key={r.participantId}
              pos={i + 1}
              name={r.name}
              isMe={r.participantId === meId}
              value={`${r.totalPoints} pts`}
              detail={`${r.daysPlayed} ${r.daysPlayed === 1 ? 'dia' : 'dias'}`}
            />
          ))}
        </div>
      )}
    </SheetShell>
  )
}

// ─── Classificação de uma campanha (melhor resultado) ───────────────────────────
export function CampaignLeaderboardSheet({
  campaignId,
  campaignLabel,
  meId,
  onClose,
}: {
  campaignId: string
  campaignLabel: string
  meId: string
  onClose: () => void
}) {
  const [rows, setRows] = useState<CampaignRankRow[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetchCampaignLeaderboard(campaignId)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [campaignId])

  return (
    <SheetShell title="Classificação da campanha" subtitle={campaignLabel} onClose={onClose}>
      {error ? (
        <StateHint text="Não foi possível carregar a classificação." />
      ) : rows == null ? (
        <StateHint text="Carregando…" />
      ) : rows.length === 0 ? (
        <StateHint text="Seja o primeiro a refazer esta campanha!" />
      ) : (
        <div className="flex flex-col gap-0.5">
          {rows.map((r, i) => (
            <RankRow
              key={r.participantId}
              pos={i + 1}
              name={r.name}
              isMe={r.participantId === meId}
              value={`${r.bestTotal}/${r.maxTotal}`}
              detail={`${r.exacts} cravada${r.exacts === 1 ? '' : 's'}${r.scorerCorrect ? ' · artilheiro' : ''}`}
            />
          ))}
        </div>
      )}
    </SheetShell>
  )
}
