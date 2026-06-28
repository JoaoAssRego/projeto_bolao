import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { hashPassword } from '../lib/password'
import type { League, LeagueInviteLink, LeagueMember, Match, Participant, Prediction } from '../lib/types'

// Colunas públicas de participants — NUNCA inclui password_hash nem auth_user_id.
// has_auth existe apenas após a migration 0004 — o select falha graciosamente se
// a coluna ainda não existe (Supabase retorna erro, capturado no refresh).
const PARTICIPANT_COLS = 'id,name,is_admin,created_at,has_password,has_auth'
const PARTICIPANT_COLS_LEGACY = 'id,name,is_admin,created_at,has_password'

// Converte o nome do participante em e-mail interno para o Supabase Auth.
// Formato: nome normalizado + @bolao.local (domínio fake, sem envio de e-mail).
function toAuthEmail(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, '.') // não-alfanum → ponto
    .replace(/\.+/g, '.') // pontos duplos → um
    .replace(/^\.|\.$/g, '') // remove ponto no início/fim
  return `${normalized}@bolao.local`
}

interface StoreValue {
  loading: boolean
  error: string | null
  configured: boolean
  participants: Participant[]
  matches: Match[]
  predictions: Prediction[]
  leagues: League[]
  leagueMembers: LeagueMember[]
  refresh: () => Promise<void>
  createParticipant: (name: string, password: string) => Promise<Participant>
  loginWithPassword: (name: string, password: string) => Promise<Participant>
  savePrediction: (participantId: string, matchId: string, home: number, away: number) => Promise<void>
  saveResult: (matchId: string, home: number, away: number, advancer: 'home' | 'away' | null) => Promise<void>
  saveKickoff: (matchId: string, kickoffIso: string) => Promise<void>
  createLeague: (name: string, creatorId: string) => Promise<League>
  deleteLeague: (leagueId: string) => Promise<void>
  inviteToLeague: (leagueId: string, participantId: string, invitedById: string) => Promise<void>
  acceptInvite: (leagueId: string, participantId: string) => Promise<void>
  declineInvite: (leagueId: string, participantId: string) => Promise<void>
  removeMember: (leagueId: string, participantId: string) => Promise<void>
  createLeagueInviteLink: (leagueId: string, createdBy: string) => Promise<LeagueInviteLink>
  acceptInviteByToken: (token: string) => Promise<string>
}


const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [leagueMembers, setLeagueMembers] = useState<LeagueMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setError('Supabase não configurado.')
      return
    }
    try {
      // Tenta com colunas novas (pós-migration 0004); cai para legado se não existirem.
      let pResult = await supabase.from('participants').select(PARTICIPANT_COLS).order('created_at')
      if (pResult.error?.code === 'PGRST204') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pResult = await supabase.from('participants').select(PARTICIPANT_COLS_LEGACY).order('created_at') as any
      }
      const [m, pr, lg, lm] = await Promise.all([
        supabase.from('matches').select('*'),
        supabase.from('predictions').select('*'),
        supabase.from('leagues').select('*'),
        supabase.from('league_members').select('*'),
      ])
      const p = pResult
      if (p.error) throw p.error
      if (m.error) throw m.error
      if (pr.error) throw pr.error
      if (lg.error) throw lg.error
      if (lm.error) throw lm.error
      if (!mounted.current) return
      setParticipants(p.data as Participant[])
      setMatches(m.data as Match[])
      setPredictions(pr.data as Prediction[])
      setLeagues(lg.data as League[])
      setLeagueMembers(lm.data as LeagueMember[])
      setError(null)
    } catch (e: unknown) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Erro ao carregar dados.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    if (!supabaseConfigured) return
    // Atualização ao vivo: qualquer mudança recarrega (volume baixo, simples e robusto).
    const channel = supabase
      .channel('bolao')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_members' }, () => void refresh())
      .subscribe()
    return () => {
      mounted.current = false
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const createParticipant = useCallback(async (name: string, password: string) => {
    const trimmed = name.trim()
    const email = toAuthEmail(trimmed)

    // Cria conta no Supabase Auth (e-mail fake, sem envio real)
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr) throw authErr
    if (!authData.user) throw new Error('Falha ao criar conta de acesso')

    // Insere participante vinculado à conta auth recém-criada
    const { data, error: err } = await supabase
      .from('participants')
      .insert({ name: trimmed, auth_user_id: authData.user.id })
      .select(PARTICIPANT_COLS)
      .single()
    if (err) throw err
    await refresh()
    return data as Participant
  }, [refresh])

  // Login via Supabase Auth. Para participantes antigos (sem auth_user_id),
  // verifica o hash legado e cria a conta auth na hora (migração lazy).
  // Se a migration 0004 ainda não foi aplicada, cai para o fluxo legado puro.
  const loginWithPassword = useCallback(async (name: string, password: string) => {
    const trimmed = name.trim()
    const email = toAuthEmail(trimmed)

    // Caminho normal: conta auth já existe
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!authErr && authData.user) {
      const { data: p, error: pErr } = await supabase
        .from('participants')
        .select(PARTICIPANT_COLS)
        .eq('auth_user_id', authData.user.id)
        .single()
      if (pErr) throw pErr
      await refresh()
      return p as Participant
    }

    // Busca participante — tenta com auth_user_id (pós-migration), cai para legado
    const fullSelect = 'id,name,is_admin,created_at,password_hash,auth_user_id,has_password'
    const legacySelect = 'id,name,is_admin,created_at,password_hash,has_password'
    let existingResult = await supabase.from('participants').select(fullSelect).eq('name', trimmed).maybeSingle()
    const migrationApplied = existingResult.error?.code !== 'PGRST204'
    if (!migrationApplied) {
      existingResult = await supabase.from('participants').select(legacySelect).eq('name', trimmed).maybeSingle()
    }
    if (existingResult.error) throw existingResult.error
    const existing = existingResult.data
    if (!existing) throw new Error('not-found')

    // Se migration aplicada e já tem auth_user_id, mas signInWithPassword falhou → senha errada
    if (migrationApplied && existing.auth_user_id) throw new Error('wrong-password')

    // Verifica hash legado
    const hash = await hashPassword(password)
    if (existing.password_hash && existing.password_hash !== hash) throw new Error('wrong-password')

    // Se migration ainda não aplicada: fluxo legado puro (sem Supabase Auth)
    if (!migrationApplied) {
      if (!existing.password_hash) {
        await supabase.from('participants').update({ password_hash: hash }).eq('id', existing.id)
      }
      await refresh()
      const { password_hash: _ph, ...rest } = existing
      return { ...rest, has_password: true, has_auth: false } as Participant
    }

    // Migration aplicada: cria conta auth e vincula ao participante existente
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (signUpErr) throw signUpErr
    // Se confirmação de e-mail está ativa, signUp retorna session=null — orienta o usuário
    if (!signUpData.session) throw new Error('email-confirmation-required')

    const { error: claimErr } = await supabase.rpc('claim_participant', { p_name: trimmed })
    if (claimErr) throw claimErr

    await refresh()
    const { password_hash: _ph, auth_user_id: _auid, ...rest } = existing
    return { ...rest, has_password: true, has_auth: true } as Participant
  }, [refresh])

  const savePrediction = useCallback(
    async (participantId: string, matchId: string, home: number, away: number) => {
      const { error: err } = await supabase
        .from('predictions')
        .upsert(
          { participant_id: participantId, match_id: matchId, home_score: home, away_score: away, updated_at: new Date().toISOString() },
          { onConflict: 'participant_id,match_id' },
        )
      if (err) throw err
      await refresh()
    },
    [refresh],
  )

  const saveResult = useCallback(
    async (matchId: string, home: number, away: number, advancer: 'home' | 'away' | null) => {
      // Lançamento manual marca result_source='manual': o sync da API não sobrescreve.
      const { error: err } = await supabase
        .from('matches')
        .update({ home_score: home, away_score: away, advancer, finished: true, result_source: 'manual' })
        .eq('id', matchId)
      if (err) throw err
      await refresh()
    },
    [refresh],
  )

  const saveKickoff = useCallback(
    async (matchId: string, kickoffIso: string) => {
      const { error: err } = await supabase.from('matches').update({ kickoff: kickoffIso }).eq('id', matchId)
      if (err) throw err
      await refresh()
    },
    [refresh],
  )

  const createLeague = useCallback(async (name: string, creatorId: string) => {
    const { data, error: err } = await supabase
      .from('leagues')
      .insert({ name: name.trim(), creator_id: creatorId })
      .select('*')
      .single()
    if (err) throw err
    // Adiciona o criador como membro aceito imediatamente.
    const { error: mErr } = await supabase
      .from('league_members')
      .insert({ league_id: data.id, participant_id: creatorId, status: 'accepted', invited_by: creatorId })
    if (mErr) throw mErr
    await refresh()
    return data as League
  }, [refresh])

  const deleteLeague = useCallback(async (leagueId: string) => {
    const { error: err } = await supabase.from('leagues').delete().eq('id', leagueId)
    if (err) throw err
    await refresh()
  }, [refresh])

  const inviteToLeague = useCallback(async (leagueId: string, participantId: string, invitedById: string) => {
    const { error: err } = await supabase
      .from('league_members')
      .insert({ league_id: leagueId, participant_id: participantId, status: 'pending', invited_by: invitedById })
    if (err) throw err
    await refresh()
  }, [refresh])

  const acceptInvite = useCallback(async (leagueId: string, participantId: string) => {
    const { error: err } = await supabase
      .from('league_members')
      .update({ status: 'accepted' })
      .eq('league_id', leagueId)
      .eq('participant_id', participantId)
    if (err) throw err
    await refresh()
  }, [refresh])

  const declineInvite = useCallback(async (leagueId: string, participantId: string) => {
    const { error: err } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('participant_id', participantId)
    if (err) throw err
    await refresh()
  }, [refresh])

  const removeMember = useCallback(async (leagueId: string, participantId: string) => {
    const { error: err } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('participant_id', participantId)
    if (err) throw err
    await refresh()
  }, [refresh])

  const createLeagueInviteLink = useCallback(async (leagueId: string, createdBy: string): Promise<LeagueInviteLink> => {
    const { data, error: err } = await supabase
      .from('league_invite_links')
      .insert({ league_id: leagueId, created_by: createdBy })
      .select('*')
      .single()
    if (err) throw err
    return data as LeagueInviteLink
  }, [])

  const acceptInviteByToken = useCallback(async (token: string): Promise<string> => {
    const { data, error: err } = await supabase.rpc('accept_invite_by_token', { p_token: token })
    if (err) throw err
    await refresh()
    return data as string
  }, [refresh])

  const value = useMemo<StoreValue>(
    () => ({
      loading,
      error,
      configured: supabaseConfigured,
      participants,
      matches,
      predictions,
      leagues,
      leagueMembers,
      refresh,
      createParticipant,
      loginWithPassword,
      savePrediction,
      saveResult,
      saveKickoff,
      createLeague,
      deleteLeague,
      inviteToLeague,
      acceptInvite,
      declineInvite,
      removeMember,
      createLeagueInviteLink,
      acceptInviteByToken,
    }),
    [loading, error, participants, matches, predictions, leagues, leagueMembers, refresh, createParticipant, loginWithPassword, savePrediction, saveResult, saveKickoff, createLeague, deleteLeague, inviteToLeague, acceptInvite, declineInvite, removeMember, createLeagueInviteLink, acceptInviteByToken],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>')
  return ctx
}
