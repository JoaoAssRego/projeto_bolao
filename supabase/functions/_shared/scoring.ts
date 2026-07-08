// ============================================================================
// Módulo compartilhado: pontuação de um palpite.
// Porta de src/lib/scoring.ts (scoreFor) para Deno — o frontend não pode ser
// importado direto pela Edge Function. Se a regra de pontuação mudar, atualize
// as duas versões juntas.
// ============================================================================

export interface ScoreMatch {
  home_score: number
  away_score: number
  stage: string
  advancer: 'home' | 'away' | null
}

export interface ScorePrediction {
  home_score: number
  away_score: number
}

/**
 * Pontuação de um palpite num jogo já finalizado, segundo as regras do bolão:
 *  - 10 pts: placar exato (pênaltis ignorados para o placar).
 *  - 7 pts: diferença de gols exata (saldo certo) ou empate não-cravado.
 *  - Fase de grupos: 5 pts se acertou o resultado (vitória/derrota).
 *  - Mata-mata: 5 pts se o time favorecido no palpite foi quem avançou.
 *  - 0 pts caso contrário (inclui não ter palpitado).
 */
export function scoreFor(pred: ScorePrediction | undefined, match: ScoreMatch): number {
  if (!pred) return 0

  const exact = pred.home_score === match.home_score && pred.away_score === match.away_score
  if (exact) return 10

  const predDiff = pred.home_score - pred.away_score
  const realDiff = match.home_score - match.away_score
  if (predDiff === realDiff) return 7

  if (match.stage === 'group' || match.stage === 'league_phase') {
    const predSign = Math.sign(predDiff)
    const realSign = Math.sign(realDiff)
    return predSign === realSign ? 5 : 0
  }

  // Mata-mata
  const matchDraw = match.home_score === match.away_score
  if (matchDraw) return 0 // foi a pênaltis; empate palpitado já caiu na regra de 7 pts
  if (pred.home_score === pred.away_score) return 0
  const favored: 'home' | 'away' = pred.home_score > pred.away_score ? 'home' : 'away'
  return match.advancer === favored ? 5 : 0
}
