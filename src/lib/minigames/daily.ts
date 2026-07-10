// ─── Mini Games: desafio do dia ────────────────────────────────────────────────
// Escolhe UM jogo (de qualquer campanha) por dia, de forma determinística: todo
// mundo pega o mesmo desafio no mesmo dia, estável entre recarregamentos. Sem
// Math.random — o índice vem de um hash da data (BRT), então é reproduzível.

import type { MgCampaign, MgPathMatch } from './types'

const BRT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje no fuso de Brasília, formato YYYY-MM-DD. */
export function brtToday(now: Date = new Date()): string {
  return BRT.format(now)
}

/** Ontem no fuso de Brasília (para cálculo da ofensiva). */
export function brtYesterday(now: Date = new Date()): string {
  return BRT.format(new Date(now.getTime() - 24 * 60 * 60 * 1000))
}

// Hash estável (djb2) de uma string → inteiro não-negativo.
function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export interface DailyChallenge {
  campaign: MgCampaign
  matchIndex: number
  match: MgPathMatch
  date: string
}

/**
 * Desafio do dia: um jogo sorteado deterministicamente entre todas as campanhas.
 * Retorna null se não há campanhas carregadas.
 */
export function dailyChallenge(campaigns: MgCampaign[], date: string): DailyChallenge | null {
  const pool: { campaign: MgCampaign; matchIndex: number }[] = []
  for (const c of campaigns) {
    c.path.forEach((_, i) => pool.push({ campaign: c, matchIndex: i }))
  }
  if (pool.length === 0) return null
  const pick = pool[hashStr(date) % pool.length]
  return {
    campaign: pick.campaign,
    matchIndex: pick.matchIndex,
    match: pick.campaign.path[pick.matchIndex],
    date,
  }
}
