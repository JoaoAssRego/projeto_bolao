export type Stage =
  | 'lib_q1'
  | 'lib_q2'
  | 'lib_q3'
  | 'group'
  | 'league_phase'
  | 'cdb_f1'
  | 'cdb_f2'
  | 'cdb_f3'
  | 'cdb_f4'
  | 'cdb_r32'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'third'
  | 'final'

export const STAGE_LABEL: Record<Stage, string> = {
  lib_q1: '1ª Fase Prévia',
  lib_q2: '2ª Fase Prévia',
  lib_q3: '3ª Fase Prévia',
  group: 'Fase de grupos',
  league_phase: 'Fase liga',
  cdb_f1: '1ª Fase',
  cdb_f2: '2ª Fase',
  cdb_f3: '3ª Fase',
  cdb_f4: '4ª Fase',
  cdb_r32: '5ª Fase',
  r32: '16-avos de final',
  r16: 'Oitavas de final',
  qf: 'Quartas de final',
  sf: 'Semifinal',
  third: 'Disputa de 3º lugar',
  final: 'Final',
}

// Ordem cronológica das fases (para ordenar a lista de jogos).
// lib_q*/cdb_f*/cdb_r32 são fases eliminatórias específicas de Libertadores e
// Copa do Brasil (Fase 2 do multi-torneio) — ver sync-resultados-bsd.
export const STAGE_ORDER: Stage[] = [
  'lib_q1',
  'lib_q2',
  'lib_q3',
  'group',
  'league_phase',
  'cdb_f1',
  'cdb_f2',
  'cdb_f3',
  'cdb_f4',
  'cdb_r32',
  'r32',
  'r16',
  'qf',
  'sf',
  'third',
  'final',
]

export interface Participant {
  id: string
  name: string
  is_admin: boolean
  created_at: string
  has_password: boolean // true quando o participante já definiu uma senha (legado)
  has_auth: boolean // true quando já tem conta Supabase Auth vinculada
  email?: string | null // email real para recuperação de senha (opcional)
}

export interface Match {
  id: string
  torneio_id: string
  stage: Stage
  ordering: number
  label: string | null
  home_team: string | null
  away_team: string | null
  home_team_code: string | null // ISO 3166-1 alpha-2 ou subdivisão (GBENG/GBSCT/GBWLS)
  away_team_code: string | null
  home_team_id: number | null // id de time da BSD Football API (Libertadores/Copa do Brasil) — null p/ Copa do Mundo/Champions
  away_team_id: number | null
  kickoff: string // ISO timestamp
  home_score: number | null
  away_score: number | null
  advancer: 'home' | 'away' | null
  finished: boolean
  created_at: string
  external_id: number | null // id do jogo no football-data.org (sync automático)
  result_source: 'manual' | 'api' // origem do resultado: lançado à mão ou pela API
  last_synced_at: string | null
  tie_id: string | null // agrupa ida/volta do mesmo confronto de mata-mata
  leg: 'ida' | 'volta' | null
}

export interface Torneio {
  id: string
  nome: string
  slug: string
  competition_code: string
  data_source: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  is_featured: boolean
  created_at: string
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
  return stage !== 'group' && stage !== 'league_phase'
}

export interface League {
  id: string
  torneio_id: string
  name: string
  creator_id: string
  created_at: string
  starts_at: string | null
}

export interface LeagueMember {
  id: string
  league_id: string
  participant_id: string
  status: 'pending' | 'requested' | 'accepted'
  invited_by: string
  created_at: string
}

export interface LeagueInviteLink {
  id: string
  league_id: string
  created_by: string
  expires_at: string
  max_uses: number
  use_count: number
  is_revoked: boolean
  created_at: string
}
