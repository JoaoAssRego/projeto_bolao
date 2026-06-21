import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Match, Participant, Prediction, Stage } from '../lib/types'

interface StoreValue {
  loading: boolean
  error: string | null
  configured: boolean
  participants: Participant[]
  matches: Match[]
  predictions: Prediction[]
  refresh: () => Promise<void>
  createParticipant: (name: string) => Promise<Participant>
  savePrediction: (participantId: string, matchId: string, home: number, away: number) => Promise<void>
  saveResult: (matchId: string, home: number, away: number, advancer: 'home' | 'away' | null) => Promise<void>
  saveMatchTeams: (matchId: string, home: string, away: string) => Promise<void>
  saveKickoff: (matchId: string, kickoffIso: string) => Promise<void>
  createMatch: (input: NewMatch) => Promise<void>
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
      const [p, m, pr] = await Promise.all([
        supabase.from('participants').select('*').order('created_at'),
        supabase.from('matches').select('*'),
        supabase.from('predictions').select('*'),
      ])
      if (p.error) throw p.error
      if (m.error) throw m.error
      if (pr.error) throw pr.error
      if (!mounted.current) return
      setParticipants(p.data as Participant[])
      setMatches(m.data as Match[])
      setPredictions(pr.data as Prediction[])
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
      .subscribe()
    return () => {
      mounted.current = false
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const createParticipant = useCallback(async (name: string) => {
    const trimmed = name.trim()
    const { data, error: err } = await supabase
      .from('participants')
      .insert({ name: trimmed })
      .select()
      .single()
    if (err) throw err
    await refresh()
    return data as Participant
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
      const { error: err } = await supabase
        .from('matches')
        .update({ home_score: home, away_score: away, advancer, finished: true })
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

  const value = useMemo<StoreValue>(
    () => ({
      loading,
      error,
      configured: supabaseConfigured,
      participants,
      matches,
      predictions,
      refresh,
      createParticipant,
      savePrediction,
      saveResult,
      saveMatchTeams,
      saveKickoff,
      createMatch,
    }),
    [loading, error, participants, matches, predictions, refresh, createParticipant, savePrediction, saveResult, saveMatchTeams, saveKickoff, createMatch],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>')
  return ctx
}
