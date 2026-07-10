// ─── Mini Games: tipos ───────────────────────────────────────────────────────
// Jogo histórico "Refaça a Glória": o usuário escolhe um time/seleção campeão e
// refaz a campanha jogo a jogo, chutando placares e, no fim, o artilheiro do
// time. Dados curados à mão em campaigns.json (fonte: Wikipédia). Sem backend:
// progresso e ofensiva vivem em localStorage (ver storage.ts).

export type MgCompetition = 'copa-do-mundo' | 'libertadores'

export type MgStage = 'group' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export interface MgPathMatch {
  stage: MgStage
  stageLabel: string
  /** null p/ jogo único; 'ida'/'volta' nos confrontos de dois jogos da Libertadores. */
  leg: 'ida' | 'volta' | null
  opponent: string
  /** ISO alpha-2 minúsculo (ou chave de bandeira) do adversário, p/ TeamCrest. */
  opponentCountryCode: string
  /** SEMPRE [gols do nosso time, gols do adversário]. */
  score: [number, number]
  /** [pênaltis nosso time, adversário] quando o confronto foi nos pênaltis; senão null. */
  penalties: [number, number] | null
  note: string | null
}

export interface MgCampaign {
  id: string
  competition: MgCompetition
  team: string
  teamKind: 'selecao' | 'clube'
  /** ISO alpha-2 minúsculo do país do time (bandeira p/ seleções e escudo-fallback de clubes). */
  teamCountryCode: string
  year: number
  topScorer: { name: string; goals: number }
  /** 4 opções (inclui o artilheiro correto), em ordem embaralhada. */
  scorerOptions: string[]
  path: MgPathMatch[]
  sourceConfidence?: 'high' | 'medium' | 'low'
  sourceNote?: string
}

export const COMPETITION_LABEL: Record<MgCompetition, string> = {
  'copa-do-mundo': 'Copa do Mundo',
  libertadores: 'Libertadores',
}

/** Emoji-troféu por competição (iconografia do app é emoji, sem lib de SVG). */
export const COMPETITION_EMOJI: Record<MgCompetition, string> = {
  'copa-do-mundo': '🌎',
  libertadores: '🏆',
}

/** Um "chute" do usuário num jogo da campanha: [nosso time, adversário]. */
export type MgGuess = [number, number]
