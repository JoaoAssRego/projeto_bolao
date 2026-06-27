import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { isKnockout } from '../lib/types'
import type { Match } from '../lib/types'
import { fromInputValue, toInputValue } from '../lib/format'
import ScoreStepper from '../components/ScoreStepper'

export default function Admin() {
  const [tab, setTab] = useState<'resultados' | 'confrontos'>('resultados')
  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 pt-2 text-lg font-bold">Admin 🛠️</h1>
      <div className="flex rounded-xl bg-emerald-950/60 p-1 text-xs font-semibold">
        {(
          [
            ['resultados', 'Resultados'],
            ['confrontos', 'Horários'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-2 ${tab === key ? 'bg-emerald-800 text-white' : 'text-emerald-300/60'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resultados' && <Resultados />}
      {tab === 'confrontos' && <Confrontos />}
    </div>
  )
}

// -------------------- Resultados --------------------

function Resultados() {
  const { matches, saveResult } = useStore()
  const lista = useMemo(
    () =>
      [...matches]
        .filter((m) => m.home_team && m.away_team)
        .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()),
    [matches],
  )

  if (lista.length === 0)
    return <p className="py-8 text-center text-sm text-emerald-300/50">Nenhum confronto definido ainda.</p>

  return (
    <div className="flex flex-col gap-2">
      {lista.map((m) => (
        <ResultadoRow key={m.id} match={m} onSave={saveResult} />
      ))}
    </div>
  )
}

function ResultadoRow({
  match,
  onSave,
}: {
  match: Match
  onSave: (id: string, h: number, a: number, adv: 'home' | 'away' | null) => Promise<void>
}) {
  const [home, setHome] = useState<number | ''>(match.home_score ?? '')
  const [away, setAway] = useState<number | ''>(match.away_score ?? '')
  const [adv, setAdv] = useState<'home' | 'away' | null>(match.advancer)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  const ko = isKnockout(match.stage)
  const isDraw = home !== '' && away !== '' && Number(home) === Number(away)
  const needAdvancer = ko && isDraw
  const canSave = home !== '' && away !== '' && (!needAdvancer || adv != null) && !busy

  async function save() {
    if (home === '' || away === '') return
    let advancer: 'home' | 'away' | null = null
    if (ko) {
      if (Number(home) > Number(away)) advancer = 'home'
      else if (Number(away) > Number(home)) advancer = 'away'
      else advancer = adv
    }
    setBusy(true)
    try {
      await onSave(match.id, Number(home), Number(away), advancer)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3">
      <div className="mb-1 flex justify-between text-[11px] text-emerald-300/50">
        <span>{match.label}</span>
        <span>
          {match.finished
            ? match.result_source === 'api'
              ? '🔄 via API (pode corrigir)'
              : 'lançado ✓'
            : 'pendente'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex-1 truncate font-medium">{match.home_team}</span>
        <ScoreStepper value={home} onChange={setHome} ariaLabel="gols mandante" />
        <span className="text-emerald-600">×</span>
        <ScoreStepper value={away} onChange={setAway} ariaLabel="gols visitante" />
        <span className="flex-1 truncate text-right font-medium">{match.away_team}</span>
      </div>

      {needAdvancer && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-emerald-300/70">Quem avançou (pênaltis)?</span>
          <button
            onClick={() => setAdv('home')}
            className={`rounded-md px-2 py-1 ${adv === 'home' ? 'bg-canarinho-green text-white' : 'bg-emerald-900 text-emerald-200'}`}
          >
            {match.home_team}
          </button>
          <button
            onClick={() => setAdv('away')}
            className={`rounded-md px-2 py-1 ${adv === 'away' ? 'bg-canarinho-green text-white' : 'bg-emerald-900 text-emerald-200'}`}
          >
            {match.away_team}
          </button>
        </div>
      )}

      <button
        onClick={save}
        disabled={!canSave}
        className={`mt-2 w-full rounded-lg py-2 text-sm font-bold ${
          ok ? 'bg-canarinho-green text-white' : 'bg-canarinho-yellow text-emerald-950 disabled:opacity-40'
        }`}
      >
        {ok ? 'Salvo ✓' : 'Salvar resultado'}
      </button>
    </div>
  )
}

// -------------------- Confrontos (times + horário) --------------------

function Confrontos() {
  const { matches, saveKickoff } = useStore()
  const lista = useMemo(
    () => [...matches].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()),
    [matches],
  )
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-emerald-300/50">
        Ajuste a data e hora dos jogos (horário de Brasília).
      </p>
      {lista.map((m) => (
        <ConfrontoRow key={m.id} match={m} onSaveKickoff={saveKickoff} />
      ))}
    </div>
  )
}

function ConfrontoRow({
  match,
  onSaveKickoff,
}: {
  match: Match
  onSaveKickoff: (id: string, iso: string) => Promise<void>
}) {
  const [when, setWhen] = useState(toInputValue(match.kickoff))
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSaveKickoff(match.id, fromInputValue(when))
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3">
      <div className="mb-2 text-[11px] text-emerald-300/50">
        {match.label} {match.home_team && match.away_team ? `· ${match.home_team} × ${match.away_team}` : ''}
      </div>
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="w-full rounded-lg bg-emerald-950 px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-600"
      />
      <button
        onClick={save}
        disabled={busy}
        className={`mt-2 w-full rounded-lg py-2 text-sm font-bold ${
          ok ? 'bg-canarinho-green text-white' : 'bg-emerald-800 text-white disabled:opacity-40'
        }`}
      >
        {ok ? 'Salvo ✓' : 'Salvar horário'}
      </button>
    </div>
  )
}

