// ─── Mini Games: acesso às campanhas ─────────────────────────────────────────
// Camada fina sobre os dados curados (campaignsData.ts): ordenação estável e
// agrupamento por time para a tela de seleção.

import { CAMPAIGNS_DATA } from './campaignsData'
import type { MgCampaign } from './types'

export const CAMPAIGNS: MgCampaign[] = CAMPAIGNS_DATA

export function getCampaign(id: string | undefined): MgCampaign | undefined {
  if (!id) return undefined
  return CAMPAIGNS.find((c) => c.id === id)
}

export interface TeamGroup {
  team: string
  teamKind: 'selecao' | 'clube'
  teamCountryCode: string
  /** Todas da mesma competição (na v1 cada time tem só uma). */
  competition: MgCampaign['competition']
  campaigns: MgCampaign[] // ordenadas por ano
  titles: number
}

/**
 * Agrupa campanhas por time. Seleções primeiro, depois clubes em ordem
 * alfabética. Dentro de cada time, campanhas por ano crescente.
 */
export function groupByTeam(): TeamGroup[] {
  const map = new Map<string, TeamGroup>()
  for (const c of CAMPAIGNS) {
    const g = map.get(c.team)
    if (g) {
      g.campaigns.push(c)
      g.titles++
    } else {
      map.set(c.team, {
        team: c.team,
        teamKind: c.teamKind,
        teamCountryCode: c.teamCountryCode,
        competition: c.competition,
        campaigns: [c],
        titles: 1,
      })
    }
  }
  const groups = [...map.values()]
  for (const g of groups) g.campaigns.sort((a, b) => a.year - b.year)
  return groups.sort((a, b) => {
    if (a.teamKind !== b.teamKind) return a.teamKind === 'selecao' ? -1 : 1
    return a.team.localeCompare(b.team, 'pt-BR')
  })
}
