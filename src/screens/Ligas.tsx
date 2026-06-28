import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import { buildStandings, withRanks } from '../lib/scoring'

const LAST_LEAGUE_KEY = 'bolao.lastLeagueId'

export default function Ligas() {
  const { participants, matches, predictions, leagues, leagueMembers, createLeague, updateLeagueStartsAt, deleteLeague, inviteToLeague, acceptInvite, declineInvite, removeMember } = useStore()
  const { me } = useAuth()

  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(
    () => localStorage.getItem(LAST_LEAGUE_KEY),
  )
  const [showCreate, setShowCreate] = useState(false)
  const [manageLeagueId, setManageLeagueId] = useState<string | null>(null)
  const [showInvites, setShowInvites] = useState(false)

  // Ligas onde sou membro aceito
  const myLeagues = useMemo(() => {
    if (!me) return []
    const myIds = new Set(
      leagueMembers.filter(m => m.participant_id === me.id && m.status === 'accepted').map(m => m.league_id),
    )
    return leagues.filter(l => myIds.has(l.id))
  }, [leagues, leagueMembers, me])

  // Convites pendentes para mim
  const pendingInvites = useMemo(() => {
    if (!me) return []
    return leagueMembers.filter(m => m.participant_id === me.id && m.status === 'pending')
  }, [leagueMembers, me])

  // Pedidos de entrada pendentes por liga (onde sou criador)
  const requestsByLeague = useMemo(() => {
    if (!me) return new Map<string, number>()
    const creatorLeagueIds = new Set(leagues.filter(l => l.creator_id === me.id).map(l => l.id))
    const map = new Map<string, number>()
    for (const m of leagueMembers) {
      if (m.status === 'requested' && creatorLeagueIds.has(m.league_id)) {
        map.set(m.league_id, (map.get(m.league_id) ?? 0) + 1)
      }
    }
    return map
  }, [leagues, leagueMembers, me])

  // Liga selecionada ainda precisa existir nas minhas ligas
  const currentLeagueId = selectedLeagueId && myLeagues.find(l => l.id === selectedLeagueId)
    ? selectedLeagueId
    : null

  function selectLeague(id: string | null) {
    setSelectedLeagueId(id)
    if (id) localStorage.setItem(LAST_LEAGUE_KEY, id)
    else localStorage.removeItem(LAST_LEAGUE_KEY)
  }

  // Participantes filtrados para o ranking
  const filteredParticipants = useMemo(() => {
    if (!currentLeagueId) return participants
    const memberIds = new Set(
      leagueMembers.filter(m => m.league_id === currentLeagueId && m.status === 'accepted').map(m => m.participant_id),
    )
    return participants.filter(p => memberIds.has(p.id))
  }, [currentLeagueId, participants, leagueMembers])

  const selectedLeague = currentLeagueId ? (leagues.find(l => l.id === currentLeagueId) ?? null) : null

  // Numa liga, só contam jogos a partir de starts_at (se definido) ou created_at.
  // No Global, conta tudo.
  const ranking = useMemo(
    () => withRanks(buildStandings(filteredParticipants, matches, predictions, selectedLeague ? (selectedLeague.starts_at ?? selectedLeague.created_at) : undefined)),
    [filteredParticipants, matches, predictions, selectedLeague],
  )

  const memberCount = selectedLeague
    ? leagueMembers.filter(m => m.league_id === selectedLeague.id && m.status === 'accepted').length
    : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-1 pt-2">
        <h1 className="text-lg font-bold text-[var(--t1)]">Ligas</h1>
        <div className="flex items-center gap-2">
          {pendingInvites.length > 0 && (
            <button
              onClick={() => setShowInvites(true)}
              className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-[var(--accent-fg)]"
            >
              {pendingInvites.length} convite{pendingInvites.length !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--raised)] text-xl leading-none text-[var(--t2)] transition-colors active:bg-[var(--border)]"
            aria-label="Criar liga"
          >
            +
          </button>
        </div>
      </div>

      {/* Abas de liga */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <Tab active={!currentLeagueId} onClick={() => selectLeague(null)}>Global</Tab>
        {myLeagues.map(league => (
          <Tab key={league.id} active={currentLeagueId === league.id} onClick={() => selectLeague(league.id)} badge={requestsByLeague.get(league.id)}>
            {league.name}
          </Tab>
        ))}
      </div>

      {/* Linha de gerenciamento (só quando uma liga está selecionada) */}
      {selectedLeague && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-[var(--t3)]">
            {memberCount} membro{memberCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setManageLeagueId(selectedLeague.id)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] active:opacity-70"
          >
            {(requestsByLeague.get(selectedLeague.id) ?? 0) > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {requestsByLeague.get(selectedLeague.id)}
              </span>
            )}
            Gerenciar
          </button>
        </div>
      )}

      {/* Ranking */}
      {ranking.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--t3)]">Ninguém aqui ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((r) => (
            <li
              key={r.participant_id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                r.participant_id === me?.id
                  ? 'border-[var(--accent-ring)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  r.rank === 1
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'bg-[var(--raised)] text-[var(--t2)]'
                }`}
              >
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[var(--t1)]">
                  {r.name}
                  {r.participant_id === me?.id && <span className="text-[var(--t3)]"> (você)</span>}
                </div>
                <div className="text-xs text-[var(--t3)]">
                  {r.exacts} cravada{r.exacts === 1 ? '' : 's'} · {r.margins} saldo{r.margins === 1 ? '' : 's'} · {r.results} resultado{r.results === 1 ? '' : 's'} ·{' '}
                  {r.played} jogo{r.played === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-[var(--t1)]">{r.points}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--t3)]">pts</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="px-1 pt-2 text-xs text-[var(--t3)]">
        Desempate: mais cravadas (10 pts) → mais saldos certos (7 pts) → mais acertos de resultado (5 pts) → posição compartilhada.
      </p>

      {/* Modais */}
      {showCreate && (
        <CreateLeagueModal
          onClose={() => setShowCreate(false)}
          onCreate={async (name, startsAt) => {
            if (!me) return
            const league = await createLeague(name, me.id, startsAt)
            selectLeague(league.id)
            setShowCreate(false)
          }}
        />
      )}
      {manageLeagueId && (
        <ManageLeagueModal
          leagueId={manageLeagueId}
          onClose={() => setManageLeagueId(null)}
          onDeleted={() => { selectLeague(null); setManageLeagueId(null) }}
          inviteToLeague={inviteToLeague}
          acceptInvite={acceptInvite}
          removeMember={removeMember}
          deleteLeague={deleteLeague}
          updateLeagueStartsAt={updateLeagueStartsAt}
        />
      )}
      {showInvites && (
        <InvitesModal
          onClose={() => setShowInvites(false)}
          acceptInvite={acceptInvite}
          declineInvite={declineInvite}
        />
      )}
    </div>
  )
}

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function Tab({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: ReactNode; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'bg-[var(--raised)] text-[var(--t2)] active:bg-[var(--border)]'
      }`}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-[var(--t1)]">{title}</h2>
          <button onClick={onClose} className="text-lg text-[var(--t3)] active:text-[var(--t1)]">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Modal: Criar liga ──────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function CreateLeagueModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, startsAt: string | null) => Promise<void> }) {
  const [name, setName] = useState('')
  const [startsDate, setStartsDate] = useState(todayIso())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    // Meia-noite no fuso de Brasília (UTC-3) = 03:00 UTC
    const startsAt = startsDate ? `${startsDate}T03:00:00Z` : null
    try {
      await onCreate(trimmed, startsAt)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.includes('unique') || msg.includes('duplicate') ? 'Você já tem uma liga com esse nome.' : 'Erro ao criar liga.')
      setLoading(false)
    }
  }

  return (
    <Modal title="Nova liga" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          placeholder="Nome da liga"
          maxLength={40}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--raised)] px-3 py-2.5 text-sm text-[var(--t1)] placeholder-[var(--t3)] focus:border-[var(--accent)] focus:outline-none"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--t2)]">Jogos contam pontos a partir de</label>
          <input
            type="date"
            value={startsDate}
            onChange={(e) => setStartsDate(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--raised)] px-3 py-2.5 text-sm text-[var(--t1)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={() => void handleCreate()}
          disabled={!name.trim() || loading}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          {loading ? 'Criando…' : 'Criar liga'}
        </button>
      </div>
    </Modal>
  )
}

// ── Modal: Gerenciar liga ──────────────────────────────────────────────────────

function ManageLeagueModal({
  leagueId, onClose, onDeleted, inviteToLeague, acceptInvite, removeMember, deleteLeague, updateLeagueStartsAt,
}: {
  leagueId: string
  onClose: () => void
  onDeleted: () => void
  inviteToLeague: (leagueId: string, participantId: string, invitedById: string) => Promise<void>
  acceptInvite: (leagueId: string, participantId: string) => Promise<void>
  removeMember: (leagueId: string, participantId: string) => Promise<void>
  deleteLeague: (leagueId: string) => Promise<void>
  updateLeagueStartsAt: (leagueId: string, startsAt: string | null) => Promise<void>
}) {
  const { leagues, leagueMembers, participants, createLeagueInviteLink } = useStore()
  const { me } = useAuth()
  const [inviteName, setInviteName] = useState('')
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [inviting, setInviting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [savingDate, setSavingDate] = useState(false)
  const [dateMsg, setDateMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const league = leagues.find(l => l.id === leagueId)
  if (!league) return null
  const leagueName = league.name

  const currentStartsIso = league.starts_at ?? league.created_at
  const [startsDate, setStartsDate] = useState(() => new Date(currentStartsIso).toISOString().slice(0, 10))

  const isCreator = me?.id === league.creator_id
  const accepted = leagueMembers.filter(m => m.league_id === leagueId && m.status === 'accepted')
  const pending = leagueMembers.filter(m => m.league_id === leagueId && m.status === 'pending')
  const requested = leagueMembers.filter(m => m.league_id === leagueId && m.status === 'requested')

  function getName(id: string) {
    return participants.find(p => p.id === id)?.name ?? '—'
  }

  async function handleSaveDate() {
    if (!startsDate) return
    setSavingDate(true)
    setDateMsg(null)
    try {
      await updateLeagueStartsAt(leagueId, `${startsDate}T03:00:00Z`)
      setDateMsg({ text: 'Data salva!', ok: true })
    } catch {
      setDateMsg({ text: 'Erro ao salvar data.', ok: false })
    } finally {
      setSavingDate(false)
    }
  }

  async function handleInvite() {
    const trimmed = inviteName.trim()
    if (!trimmed || !me) return
    setInviteMsg(null)
    const target = participants.find(p => p.name.toLowerCase() === trimmed.toLowerCase())
    if (!target) { setInviteMsg({ text: 'Usuário não encontrado.', ok: false }); return }
    const existing = leagueMembers.find(m => m.league_id === leagueId && m.participant_id === target.id)
    if (existing) {
      setInviteMsg({ text: existing.status === 'pending' ? 'Convite já enviado.' : 'Usuário já é membro.', ok: false })
      return
    }
    setInviting(true)
    try {
      await inviteToLeague(leagueId, target.id, me.id)
      setInviteName('')
      setInviteMsg({ text: 'Convite enviado!', ok: true })
    } catch {
      setInviteMsg({ text: 'Erro ao convidar.', ok: false })
    } finally {
      setInviting(false)
    }
  }

  async function handleWhatsAppShare() {
    if (!me) return
    setSharing(true)
    try {
      const link = await createLeagueInviteLink(leagueId, me.id)
      const url = `${window.location.origin}/convite/${link.id}`
      const text = `Entre no bolão! Clique para participar da liga "${leagueName}":\n${url}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      // falha silenciosa — raro, sem impacto crítico
    } finally {
      setSharing(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir a liga "${leagueName}"? Isso não pode ser desfeito.`)) return
    await deleteLeague(leagueId)
    onDeleted()
  }

  return (
    <Modal title={leagueName} onClose={onClose}>
      <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {/* Seção de convite (só criador) */}
        {isCreator && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void handleWhatsAppShare()}
              disabled={sharing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {sharing ? 'Gerando link…' : 'Convidar via WhatsApp'}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[10px] text-[var(--t3)]">ou convidar por nome</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteName}
                onChange={(e) => { setInviteName(e.target.value); setInviteMsg(null) }}
                onKeyDown={(e) => e.key === 'Enter' && void handleInvite()}
                placeholder="Nome do participante"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--raised)] px-3 py-2 text-sm text-[var(--t1)] placeholder-[var(--t3)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                onClick={() => void handleInvite()}
                disabled={!inviteName.trim() || inviting}
                className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
              >
                Convidar
              </button>
            </div>
            {inviteMsg && (
              <p className={`text-xs ${inviteMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{inviteMsg.text}</p>
            )}
          </div>
        )}

        {/* Data de início da contagem de pontos (só criador) */}
        {isCreator && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--t2)]">Pontos contam a partir de</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={startsDate}
                onChange={(e) => { setStartsDate(e.target.value); setDateMsg(null) }}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--raised)] px-3 py-2 text-sm text-[var(--t1)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                onClick={() => void handleSaveDate()}
                disabled={savingDate}
                className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
              >
                {savingDate ? '…' : 'Salvar'}
              </button>
            </div>
            {dateMsg && (
              <p className={`text-xs ${dateMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{dateMsg.text}</p>
            )}
          </div>
        )}

        {/* Membros aceitos */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--t2)]">Membros</span>
          {accepted.length === 0 ? (
            <p className="text-xs text-[var(--t3)]">Nenhum membro ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {accepted.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded-lg bg-[var(--raised)] px-3 py-2">
                  <span className="text-sm text-[var(--t1)]">
                    {getName(m.participant_id)}
                    {m.participant_id === league.creator_id && (
                      <span className="ml-1.5 text-[10px] text-[var(--t3)]">criador</span>
                    )}
                    {m.participant_id === me?.id && (
                      <span className="text-[var(--t3)]"> (você)</span>
                    )}
                  </span>
                  {isCreator && m.participant_id !== league.creator_id && (
                    <button
                      onClick={() => void removeMember(leagueId, m.participant_id)}
                      className="text-xs text-red-400 active:opacity-70"
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pedidos de entrada via link (só criador vê) */}
        {isCreator && requested.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--t2)]">
              Pedidos de entrada
              <span className="ml-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-fg)]">
                {requested.length}
              </span>
            </span>
            <ul className="flex flex-col gap-1.5">
              {requested.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border border-[var(--accent-ring)] bg-[var(--accent-muted)] px-3 py-2">
                  <span className="text-sm font-medium text-[var(--t1)]">{getName(m.participant_id)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void acceptInvite(leagueId, m.participant_id)}
                      className="text-xs font-semibold text-[var(--accent)] active:opacity-70"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => void removeMember(leagueId, m.participant_id)}
                      className="text-xs text-red-400 active:opacity-70"
                    >
                      Recusar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Convites pendentes (enviados pelo criador, aguardando o convidado aceitar) */}
        {pending.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--t2)]">Convites enviados</span>
            <ul className="flex flex-col gap-1.5">
              {pending.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded-lg bg-[var(--raised)] px-3 py-2">
                  <span className="text-sm italic text-[var(--t3)]">{getName(m.participant_id)}</span>
                  {isCreator && (
                    <button
                      onClick={() => void removeMember(leagueId, m.participant_id)}
                      className="text-xs text-red-400 active:opacity-70"
                    >
                      Cancelar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ações destrutivas */}
        <div className="border-t border-[var(--border)] pt-3">
          {isCreator ? (
            <button
              onClick={() => void handleDelete()}
              className="w-full rounded-lg border border-red-500/30 py-2.5 text-sm font-medium text-red-400 active:opacity-70"
            >
              Excluir liga
            </button>
          ) : (
            <button
              onClick={async () => { if (me) await removeMember(leagueId, me.id); onClose() }}
              className="w-full rounded-lg border border-red-500/30 py-2.5 text-sm font-medium text-red-400 active:opacity-70"
            >
              Sair da liga
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: Convites pendentes ──────────────────────────────────────────────────

function InvitesModal({
  onClose, acceptInvite, declineInvite,
}: {
  onClose: () => void
  acceptInvite: (leagueId: string, participantId: string) => Promise<void>
  declineInvite: (leagueId: string, participantId: string) => Promise<void>
}) {
  const { leagues, leagueMembers, participants } = useStore()
  const { me } = useAuth()

  const pending = useMemo(() => {
    if (!me) return []
    return leagueMembers.filter(m => m.participant_id === me.id && m.status === 'pending')
  }, [leagueMembers, me])

  return (
    <Modal title="Convites pendentes" onClose={onClose}>
      {pending.length === 0 ? (
        <p className="text-sm text-[var(--t3)]">Nenhum convite pendente.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map(m => {
            const leagueName = leagues.find(l => l.id === m.league_id)?.name ?? '—'
            const inviterName = participants.find(p => p.id === m.invited_by)?.name ?? '—'
            return (
              <li key={m.id} className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--raised)] p-3">
                <div>
                  <div className="font-semibold text-[var(--t1)]">{leagueName}</div>
                  <div className="text-xs text-[var(--t3)]">Convidado por {inviterName}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => me && void acceptInvite(m.league_id, me.id)}
                    className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--accent-fg)]"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => me && void declineInvite(m.league_id, me.id)}
                    className="flex-1 rounded-lg border border-[var(--border)] py-2 text-xs font-medium text-[var(--t2)]"
                  >
                    Recusar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
