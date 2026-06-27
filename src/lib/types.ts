export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export const STAGE_LABEL: Record<Stage, string> = {
  group: 'Fase de grupos',
  r32: '32-avos de final',
  r16: 'Oitavas de final',
  qf: 'Quartas de final',
  sf: 'Semifinal',
  third: 'Disputa de 3º lugar',
  final: 'Final',
}

// Ordem cronológica das fases (para ordenar a lista de jogos)
export const STAGE_ORDER: Stage[] = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final']

export interface Participant {
  id: string
  name: string
  is_admin: boolean
  created_at: string
  has_password: boolean // true quando o participante já definiu uma senha (legado)
  has_auth: boolean // true quando já tem conta Supabase Auth vinculada
}

export interface Match {
  id: string
  stage: Stage
  ordering: number
  label: string | null
  home_team: string | null
  away_team: string | null
  home_team_code: string | null // ISO 3166-1 alpha-2 ou subdivisão (GBENG/GBSCT/GBWLS)
  away_team_code: string | null
  kickoff: string // ISO timestamp
  home_score: number | null
  away_score: number | null
  advancer: 'home' | 'away' | null
  finished: boolean
  created_at: string
  external_id: number | null // id do jogo no football-data.org (sync automático)
  result_source: 'manual' | 'api' // origem do resultado: lançado à mão ou pela API
  last_synced_at: string | null
}

export interface Prediction {
  id: string
  participant_id: string
  match_id: string
  home_score: number
  away_score: number
  updated_at: string
}

export function isKnockout(stage: Stage): boolean {
  return stage !== 'group'
}

export interface League {
  id: string
  name: string
  creator_id: string
  created_at: string
}

export interface LeagueMember {
  id: string
  league_id: string
  participant_id: string
  status: 'pending' | 'accepted'
  invited_by: string
  created_at: string
}
