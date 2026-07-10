// ─── Mini Games: leaderboards compartilhados (Supabase) ─────────────────────────
// Complementa o localStorage (storage.ts): além do progresso local, cada jogada
// também sobe pro banco pra alimentar dois rankings GLOBAIS do bolão:
//   • por campanha  — melhor resultado de cada um (submit_minigame_campaign_score)
//   • desafio do dia — pontos por dia, recortáveis em semana/mês/total
// Escrita via RPC security definer (regras "só o melhor" / "1x por dia" ficam no
// banco). Leitura é direta (SELECT público) + RPC de agregação pro diário.

import { supabase } from '../supabase'
import type { CampaignScore } from './scoring'
import type { MgCampaign } from './types'
import type { MgDailyEntry } from './storage'
import { brtToday } from './daily'

export type DailyRange = 'week' | 'month' | 'total'

export interface CampaignRankRow {
  participantId: string
  name: string
  bestTotal: number
  maxTotal: number
  exacts: number
  scorerCorrect: boolean
}

export interface DailyRankRow {
  participantId: string
  name: string
  totalPoints: number
  daysPlayed: number
}

/** Início do recorte (YYYY-MM-DD, BRT). null = total (sem filtro de data). */
export function brtRangeStart(range: DailyRange, today: string = brtToday()): string | null {
  if (range === 'total') return null
  const [y, m, d] = today.split('-').map(Number)
  if (range === 'month') return `${y}-${String(m).padStart(2, '0')}-01`
  // Semana: segunda-feira desta semana. Usa UTC só pra aritmética de calendário.
  const dt = new Date(Date.UTC(y, m - 1, d))
  const daysSinceMonday = (dt.getUTCDay() + 6) % 7 // 0=dom → 6, 1=seg → 0, ...
  dt.setUTCDate(dt.getUTCDate() - daysSinceMonday)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

// ─── Escrita (fire-and-forget: o chamador engole erro, é só placar) ──────────────
export async function submitCampaignScore(campaign: MgCampaign, score: CampaignScore): Promise<void> {
  const { error } = await supabase.rpc('submit_minigame_campaign_score', {
    p_campaign_id: campaign.id,
    p_total: score.total,
    p_max: score.max,
    p_exacts: score.exacts,
    p_scorer_correct: score.scorerCorrect,
  })
  if (error) throw error
}

export async function submitDailyScore(date: string, entry: MgDailyEntry): Promise<void> {
  const { error } = await supabase.rpc('submit_minigame_daily_score', {
    p_play_date: date,
    p_campaign_id: entry.campaignId,
    p_match_index: entry.matchIndex,
    p_points: entry.points,
  })
  if (error) throw error
}

// ─── Leitura ─────────────────────────────────────────────────────────────────────
export async function fetchCampaignLeaderboard(campaignId: string): Promise<CampaignRankRow[]> {
  const { data, error } = await supabase
    .from('minigame_campaign_scores')
    .select('participant_id, best_total, max_total, exacts, scorer_correct, participants(name)')
    .eq('campaign_id', campaignId)
    .order('best_total', { ascending: false })
    .order('exacts', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      participant_id: string
      best_total: number
      max_total: number
      exacts: number
      scorer_correct: boolean
      participants: { name: string } | { name: string }[] | null
    }
    const p = Array.isArray(row.participants) ? row.participants[0] : row.participants
    return {
      participantId: row.participant_id,
      name: p?.name ?? '—',
      bestTotal: row.best_total,
      maxTotal: row.max_total,
      exacts: row.exacts,
      scorerCorrect: row.scorer_correct,
    }
  })
}

export async function fetchDailyLeaderboard(range: DailyRange): Promise<DailyRankRow[]> {
  const { data, error } = await supabase.rpc('minigame_daily_leaderboard', {
    p_since: brtRangeStart(range),
  })
  if (error) throw error
  return ((data ?? []) as { participant_id: string; name: string; total_points: number; days_played: number }[]).map((r) => ({
    participantId: r.participant_id,
    name: r.name,
    totalPoints: Number(r.total_points),
    daysPlayed: Number(r.days_played),
  }))
}
