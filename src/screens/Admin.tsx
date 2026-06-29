import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { isKnockout } from '../lib/types'
import type { Match, Participant } from '../lib/types'
import { fromInputValue, toInputValue } from '../lib/format'
import ScoreStepper from '../components/ScoreStepper'
import { supabase } from '../lib/supabase'

// Subset of common teams for ISO auto-fill when admin types a name
const QUICK_ISO: Record<string, string> = {
  brasil: 'BR', brazil: 'BR', argentina: 'AR', franca: 'FR', france: 'FR', frança: 'FR',
  inglaterra: 'GBENG', england: 'GBENG', espanha: 'ES', spain: 'ES', portugal: 'PT',
  alemanha: 'DE', germany: 'DE', holanda: 'NL', netherlands: 'NL', belgica: 'BE', belgium: 'BE',
  croacia: 'HR', croatia: 'HR', italia: 'IT', italy: 'IT', uruguai: 'UY', uruguay: 'UY',
  colombia: 'CO', mexico: 'MX', 'estados unidos': 'US', usa: 'US', canada: 'CA', canadá: 'CA',
  japao: 'JP', japão: 'JP', japan: 'JP', 'coreia do sul': 'KR', australia: 'AU',
  marrocos: 'MA', morocco: 'MA', senegal: 'SN', nigeria: 'NG', nigéria: 'NG',
  paraguai: 'PY', paraguay: 'PY', equador: 'EC', ecuador: 'EC', chile: 'CL', peru: 'PE',
  suica: 'CH', suíça: 'CH', suecia: 'SE', suécia: 'SE', dinamarca: 'DK', denmark: 'DK',
  polonia: 'PL', polônia: 'PL', serbia: 'RS', sérvia: 'RS', turquia: 'TR', turkey: 'TR',
  ucrania: 'UA', ucrânia: 'UA', austria: 'AT', áustria: 'AT', escocia: 'GBSCT', escócia: 'GBSCT',
  'pais de gales': 'GBWLS', 'país de gales': 'GBWLS', wales: 'GBWLS',
  noruega: 'NO', norway: 'NO', suica2: 'CH', hungary: 'HU', hungria: 'HU',
  'arabia saudita': 'SA', 'arábia saudita': 'SA', iran: 'IR', irã: 'IR', catar: 'QA', qatar: 'QA',
  camaroes: 'CM', camarões: 'CM', cameroon: 'CM', ghana: 'GH', gana: 'GH',
  'costa do marfim': 'CI', morocco2: 'MA', 'africa do sul': 'ZA', 'áfrica do sul': 'ZA',
  venezuela: 'VE', bolivia: 'BO', bolívia: 'BO', russia: 'RU', rússia: 'RU',
  panama: 'PA', panamá: 'PA', honduras: 'HN', jamaica: 'JM', 'costa rica': 'CR',
}

function autoIso(name: string): string {
  const key = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  return QUICK_ISO[key] ?? ''
}

type Tab = 'resultados' | 'confrontos' | 'sync' | 'participantes'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('resultados')
  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 pt-2 text-lg font-bold">Admin 🛠️</h1>
      <div className="flex rounded-xl bg-emerald-950/60 p-1 text-xs font-semibold">
        {(
          [
            ['resultados', 'Resultados'],
            ['confrontos', 'Horários'],
            ['sync', 'Sync'],
            ['participantes', 'Participantes'],
          ] as [Tab, string][]
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
      {tab === 'sync' && <SyncPanel />}
      {tab === 'participantes' && <Participantes />}
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
  const { matches, saveKickoff, saveTeams, deleteMatch } = useStore()
  const lista = useMemo(
    () => [...matches].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()),
    [matches],
  )
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-emerald-300/50">
        Defina confrontos pendentes, ajuste horários ou remova slots sem uso (byes).
      </p>
      {lista.map((m) => (
        <ConfrontoRow
          key={m.id}
          match={m}
          onSaveKickoff={saveKickoff}
          onSaveTeams={saveTeams}
          onDelete={deleteMatch}
        />
      ))}
    </div>
  )
}

function ConfrontoRow({
  match,
  onSaveKickoff,
  onSaveTeams,
  onDelete,
}: {
  match: Match
  onSaveKickoff: (id: string, iso: string) => Promise<void>
  onSaveTeams: (id: string, ht: string, hc: string, at: string, ac: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [when, setWhen] = useState(toInputValue(match.kickoff))
  const [homeTeam, setHomeTeam] = useState(match.home_team ?? '')
  const [awayTeam, setAwayTeam] = useState(match.away_team ?? '')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const teamsUndefined = !match.home_team || !match.away_team

  async function saveKickoff() {
    setBusy(true)
    try {
      await onSaveKickoff(match.id, fromInputValue(when))
      setOk('horário')
      setTimeout(() => setOk(null), 1500)
    } finally {
      setBusy(false)
    }
  }

  async function saveTeams() {
    const ht = homeTeam.trim()
    const at = awayTeam.trim()
    if (!ht || !at) return
    setBusy(true)
    try {
      await onSaveTeams(match.id, ht, autoIso(ht), at, autoIso(at))
      setOk('times')
      setTimeout(() => setOk(null), 1500)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setBusy(true)
    try {
      await onDelete(match.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3">
      <div className="mb-2 text-[11px] text-emerald-300/50">
        {match.label}
        {match.home_team && match.away_team
          ? ` · ${match.home_team} × ${match.away_team}`
          : ' · confronto a definir'}
      </div>

      {/* Edição de times (só quando não definidos) */}
      {teamsUndefined && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Mandante (ex: Alemanha)"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="flex-1 min-w-0 rounded-lg bg-emerald-950 px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <input
              type="text"
              placeholder="Visitante (ex: Paraguai)"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className="flex-1 min-w-0 rounded-lg bg-emerald-950 px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveTeams}
              disabled={busy || !homeTeam.trim() || !awayTeam.trim()}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                ok === 'times'
                  ? 'bg-canarinho-green text-white'
                  : 'bg-canarinho-yellow text-emerald-950 disabled:opacity-40'
              }`}
            >
              {ok === 'times' ? 'Salvo ✓' : 'Definir confronto'}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                confirmDelete
                  ? 'bg-red-600 text-white'
                  : 'bg-emerald-900 text-emerald-300'
              }`}
            >
              {confirmDelete ? 'Confirmar?' : 'Excluir'}
            </button>
          </div>
        </div>
      )}

      {/* Edição de horário */}
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="w-full rounded-lg bg-emerald-950 px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-600"
      />
      <button
        onClick={saveKickoff}
        disabled={busy}
        className={`mt-2 w-full rounded-lg py-2 text-sm font-bold ${
          ok === 'horário' ? 'bg-canarinho-green text-white' : 'bg-emerald-800 text-white disabled:opacity-40'
        }`}
      >
        {ok === 'horário' ? 'Salvo ✓' : 'Salvar horário'}
      </button>
    </div>
  )
}

// -------------------- Participantes (reset de senha) --------------------

function Participantes() {
  const { participants, adminCreateResetToken } = useStore()
  const sorted = useMemo(() => [...participants].sort((a, b) => a.name.localeCompare(b.name)), [participants])

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-emerald-300/50">
        Gere um código temporário para um participante redefinir a senha. Validade: 2 horas.
      </p>
      {sorted.map((p) => (
        <ParticipanteRow key={p.id} participant={p} onGenerateToken={adminCreateResetToken} />
      ))}
    </div>
  )
}

function ParticipanteRow({
  participant,
  onGenerateToken,
}: {
  participant: Participant
  onGenerateToken: (id: string) => Promise<string>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setBusy(true)
    try {
      const t = await onGenerateToken(participant.id)
      setToken(t)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3 py-2">
      <span className="truncate text-sm font-medium">{participant.name}</span>
      {token ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-base font-bold tracking-widest text-canarinho-yellow">
            {token}
          </span>
          <button
            onClick={copy}
            className="rounded-md bg-emerald-800 px-2 py-1 text-xs text-white"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={() => setToken(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={busy}
          className="shrink-0 rounded-lg bg-emerald-800 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy ? '…' : 'Gerar código'}
        </button>
      )}
    </div>
  )
}

// -------------------- Sync --------------------

function SyncPanel() {
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle')
  const [log, setLog] = useState<string | null>(null)

  async function dispararSync() {
    setStatus('running')
    setLog(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-resultados')
      if (error) throw error
      setStatus('ok')
      setLog(JSON.stringify(data, null, 2))
    } catch (e: unknown) {
      setStatus('error')
      setLog(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs text-emerald-300/50">
        Sincroniza jogos e placares com o football-data.org. Use após o chaveamento ser anunciado
        para preencher confrontos automaticamente.
      </p>
      <button
        onClick={dispararSync}
        disabled={status === 'running'}
        className={`w-full rounded-xl py-3 text-sm font-bold ${
          status === 'ok'
            ? 'bg-canarinho-green text-white'
            : status === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-canarinho-yellow text-emerald-950 disabled:opacity-40'
        }`}
      >
        {status === 'running'
          ? 'Sincronizando…'
          : status === 'ok'
            ? 'Sync concluído ✓'
            : status === 'error'
              ? 'Erro — ver log abaixo'
              : 'Disparar sync agora'}
      </button>
      {log && (
        <pre className="overflow-x-auto rounded-xl bg-emerald-950 p-3 text-[11px] text-emerald-300/70 whitespace-pre-wrap">
          {log}
        </pre>
      )}
    </div>
  )
}
