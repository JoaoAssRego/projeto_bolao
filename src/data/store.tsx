import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { hashPassword } from '../lib/password'
import type { League, LeagueMember, Match, Participant, Prediction, Stage } from '../lib/types'

// Colunas públicas de participants — NUNCA inclui password_hash, que fica só no
// banco e é conferido pontualmente no login (loginWithPassword).
const PARTICIPANT_COLS = 'id,name,is_admin,created_at,has_password'

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
  saveMatchTeams: (matchId: string, home: string, away: string) => Promise<void>
  saveKickoff: (matchId: string, kickoffIso: string) => Promise<void>
  createMatch: (input: NewMatch) => Promise<void>
  createLeague: (name: string, creatorId: string) => Promise<League>
  deleteLeague: (leagueId: string) => Promise<void>
  inviteToLeague: (leagueId: string, participantId: string, invitedById: string) => Promise<void>
  acceptInvite: (leagueId: string, participantId: string) => Promise<void>
  declineInvite: (leagueId: string, participantId: string) => Promise<void>
  removeMember: (leagueId: string, participantId: string) => Promise<void>
}

export interface NewMatch {
  stage: Stage
  label: string
  home_team: string | null
  away_team: string | null
  kickoff: string
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
      const [p, m, pr, lg, lm] = await Promise.all([
        supabase.from('participants').select(PARTICIPANT_COLS).order('created_at'),
        supabase.from('matches').select('*'),
        supabase.from('predictions').select('*'),
        supabase.from('leagues').select('*'),
        supabase.from('league_members').select('*'),
      ])
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
    const password_hash = await hashPassword(password)
    const { data, error: err } = await supabase
      .from('participants')
      .insert({ name: trimmed, password_hash })
      .select(PARTICIPANT_COLS)
      .single()
    if (err) throw err
    await refresh()
    return data as Participant
  }, [refresh])

  // Confere a senha contra o hash do banco. Se o participante ainda não tem senha
  // (cadastro antigo), define a informada agora ("primeiro acesso").
  const loginWithPassword = useCallback(async (name: string, password: string) => {
    const { data, error: err } = await supabase
      .from('participants')
      .select('id,name,is_admin,created_at,password_hash')
      .eq('name', name.trim())
      .maybeSingle()
    if (err) throw err
    if (!data) throw new Error('not-found')

    const hash = await hashPassword(password)
    if (!data.password_hash) {
      const { error: upErr } = await supabase
        .from('participants')
        .update({ password_hash: hash })
        .eq('id', data.id)
      if (upErr) throw upErr
    } else if (data.password_hash !== hash) {
      throw new Error('wrong-password')
    }

    await refresh()
    const { password_hash: _omit, ...rest } = data
    return { ...rest, has_password: true } as Participant
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

  const saveMatchTeams = useCallback(
    async (matchId: string, home: string, away: string) => {
      const { error: err } = await supabase
        .from('matches')
        .update({ home_team: home.trim() || null, away_team: away.trim() || null })
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

  const createMatch = useCallback(
    async (input: NewMatch) => {
      // ordering = próximo número livre dentro da fase
      const inStage = matches.filter((m) => m.stage === input.stage)
      const ordering = inStage.reduce((max, m) => Math.max(max, m.ordering), 0) + 1
      const { error: err } = await supabase.from('matches').insert({
        stage: input.stage,
        ordering,
        label: input.label || null,
        home_team: input.home_team,
        away_team: input.away_team,
        kickoff: input.kickoff,
      })
      if (err) throw err
      await refresh()
    },
    [matches, refresh],
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
      saveMatchTeams,
      saveKickoff,
      createMatch,
      createLeague,
      deleteLeague,
      inviteToLeague,
      acceptInvite,
      declineInvite,
      removeMember,
    }),
    [loading, error, participants, matches, predictions, leagues, leagueMembers, refresh, createParticipant, loginWithPassword, savePrediction, saveResult, saveMatchTeams, saveKickoff, createMatch, createLeague, deleteLeague, inviteToLeague, acceptInvite, declineInvite, removeMember],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>')
  return ctx
}
