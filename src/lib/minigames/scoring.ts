// ─── Mini Games: pontuação ─────────────────────────────────────────────────────
// Mesma semântica do bolão oficial (10/7/5/0), mas isolada do tipo Match — aqui
// pontuamos um chute contra o placar histórico real. Todo jogo é pontuado por
// resultado (não usa a regra de "quem avançou" do mata-mata): o que vale é
// acertar o placar daquele jogo.

import type { MgCampaign, MgGuess, MgPathMatch } from './types'

export const ARTILHEIRO_POINTS = 10

/**
 * Pontua um chute contra o placar real:
 *  - 10: placar exato
 *  - 7: saldo de gols exato (mesma margem ou empate não-cravado)
 *  - 5: acertou o resultado (vitória / empate / derrota)
 *  - 0: errou
 */
export function scoreGuess(guess: MgGuess, actual: [number, number]): 0 | 5 | 7 | 10 {
  const [gh, ga] = guess
  const [ah, aa] = actual
  if (gh === ah && ga === aa) return 10
  if (gh - ga === ah - aa) return 7
  if (Math.sign(gh - ga) === Math.sign(ah - aa)) return 5
  return 0
}

/** Pontos de um jogo já respondido (helper de leitura). */
export function scoreMatch(guess: MgGuess, match: MgPathMatch): 0 | 5 | 7 | 10 {
  return scoreGuess(guess, match.score)
}

export interface CampaignScore {
  perMatch: (0 | 5 | 7 | 10)[]
  matchTotal: number
  scorerCorrect: boolean
  scorerPoints: number
  total: number
  max: number
  /** nº de placares cravados (10 pts) — usado no compartilhamento/insígnias. */
  exacts: number
}

/** Pontuação máxima possível de uma campanha (todos os jogos + artilheiro). */
export function maxCampaignScore(campaign: MgCampaign): number {
  return campaign.path.length * 10 + ARTILHEIRO_POINTS
}

/** Pontua a campanha inteira. `scorerGuess` é o nome escolhido para artilheiro. */
export function scoreCampaign(
  campaign: MgCampaign,
  guesses: MgGuess[],
  scorerGuess: string | null,
): CampaignScore {
  const perMatch = campaign.path.map((m, i) =>
    guesses[i] ? scoreGuess(guesses[i], m.score) : (0 as const),
  )
  const matchTotal = perMatch.reduce<number>((s, p) => s + p, 0)
  const scorerCorrect = scorerGuess != null && scorerGuess === campaign.topScorer.name
  const scorerPoints = scorerCorrect ? ARTILHEIRO_POINTS : 0
  return {
    perMatch,
    matchTotal,
    scorerCorrect,
    scorerPoints,
    total: matchTotal + scorerPoints,
    max: maxCampaignScore(campaign),
    exacts: perMatch.filter((p) => p === 10).length,
  }
}
