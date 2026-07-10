// ─── Mini Games: persistência local ─────────────────────────────────────────
// Sem backend na v1: progresso, melhores pontuações e ofensiva (streak) vivem
// em localStorage, isolados por participante (evita misturar dados quando o
// mesmo aparelho é usado por gente diferente). Um leaderboard compartilhado
// (Supabase) é o próximo passo — ver o resumo da branch.

import type { CampaignScore } from './scoring'
import type { MgGuess } from './types'

const KEY_PREFIX = 'bolao.minigames.v1'

export interface MgCampaignResult {
  bestTotal: number
  max: number
  exacts: number
  scorerCorrect: boolean
  plays: number
  lastPlayedAt: string // ISO
}

export interface MgDailyEntry {
  campaignId: string
  matchIndex: number
  guess: MgGuess
  points: number
}

export interface MgState {
  results: Record<string, MgCampaignResult>
  daily: {
    lastPlayedDate: string | null // YYYY-MM-DD (BRT)
    streak: number
    bestStreak: number
    history: Record<string, MgDailyEntry> // por data
  }
}

const EMPTY: MgState = {
  results: {},
  daily: { lastPlayedDate: null, streak: 0, bestStreak: 0, history: {} },
}

function keyFor(pid: string): string {
  return `${KEY_PREFIX}.${pid}`
}

export function loadState(pid: string): MgState {
  try {
    const raw = localStorage.getItem(keyFor(pid))
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as Partial<MgState>
    return {
      results: parsed.results ?? {},
      daily: {
        lastPlayedDate: parsed.daily?.lastPlayedDate ?? null,
        streak: parsed.daily?.streak ?? 0,
        bestStreak: parsed.daily?.bestStreak ?? 0,
        history: parsed.daily?.history ?? {},
      },
    }
  } catch {
    return structuredClone(EMPTY)
  }
}

function persist(pid: string, state: MgState): void {
  try {
    localStorage.setItem(keyFor(pid), JSON.stringify(state))
  } catch {
    // storage cheio / indisponível: falha silenciosa, é só progresso de jogo.
  }
}

/** Grava (ou melhora) o resultado de uma campanha. Retorna o estado atualizado. */
export function saveCampaignResult(
  pid: string,
  campaignId: string,
  score: CampaignScore,
): MgState {
  const state = loadState(pid)
  const prev = state.results[campaignId]
  const bestTotal = Math.max(prev?.bestTotal ?? 0, score.total)
  state.results[campaignId] = {
    bestTotal,
    max: score.max,
    exacts: Math.max(prev?.exacts ?? 0, score.exacts),
    scorerCorrect: (prev?.scorerCorrect ?? false) || score.scorerCorrect,
    plays: (prev?.plays ?? 0) + 1,
    lastPlayedAt: new Date().toISOString(),
  }
  persist(pid, state)
  return state
}

/**
 * Registra a jogada do desafio do dia e atualiza a ofensiva.
 * A streak sobe se a última jogada foi ontem; reinicia (em 1) se houve buraco.
 */
export function recordDaily(
  pid: string,
  today: string,
  yesterday: string,
  entry: MgDailyEntry,
): MgState {
  const state = loadState(pid)
  if (state.daily.history[today]) return state // já jogou hoje (idempotente)

  const last = state.daily.lastPlayedDate
  const nextStreak = last === yesterday ? state.daily.streak + 1 : 1
  state.daily = {
    lastPlayedDate: today,
    streak: nextStreak,
    bestStreak: Math.max(state.daily.bestStreak, nextStreak),
    history: { ...state.daily.history, [today]: entry },
  }
  persist(pid, state)
  return state
}

export function playedDailyOn(state: MgState, today: string): boolean {
  return Boolean(state.daily.history[today])
}
