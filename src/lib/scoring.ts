import type { Match, Prediction } from './types'

/** Um jogo trava (palpites fecham) no horário de início. */
export function isLocked(match: Match, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(match.kickoff).getTime()
}

/** Já temos resultado lançado para este jogo? */
export function hasResult(match: Match): boolean {
  return match.finished && match.home_score != null && match.away_score != null
}

/**
 * Pontuação de um palpite num jogo, segundo as regras do bolão:
 *  - 10 pts: placar exato (pênaltis ignorados para o placar).
 *  - Fase de grupos: 5 pts se acertou o resultado (vitória/empate/derrota).
 *  - Mata-mata: 5 pts se o time favorecido no palpite foi quem avançou.
 *    (palpite de empate no mata-mata não pode ganhar os 5.)
 *  - 0 pts caso contrário.
 * Retorna null se o jogo ainda não tem resultado.
 */
export function scoreFor(pred: Prediction | undefined, match: Match): number | null {
  if (!hasResult(match)) return null
  if (!pred) return 0 // não palpitou a tempo

  const exact = pred.home_score === match.home_score && pred.away_score === match.away_score
  if (exact) return 10

  if (match.stage === 'group') {
    const predSign = Math.sign(pred.home_score - pred.away_score)
    const realSign = Math.sign((match.home_score as number) - (match.away_score as number))
    return predSign === realSign ? 5 : 0
  }

  // Mata-mata
  if (pred.home_score === pred.away_score) return 0 // empate palpitado: não favorece ninguém
  const favored: 'home' | 'away' = pred.home_score > pred.away_score ? 'home' : 'away'
  return match.advancer === favored ? 5 : 0
}

export interface Standing {
  participant_id: string
  name: string
  points: number
  exacts: number // nº de cravadas (10 pts)
  results: number // nº de acertos de resultado (5 pts)
  played: number // jogos com resultado já lançado
}

/**
 * Monta a classificação geral.
 * Desempate: pontos > cravadas > acertos de resultado (depois empata mesmo).
 *
 * `since` (ISO timestamp): quando informado, só contam jogos cujo início (kickoff)
 * seja a partir desse momento. Usado pelas ligas, para que todos comecem zerados
 * a partir da criação da liga — jogos anteriores não contam.
 */
export function buildStandings(
  participants: { id: string; name: string }[],
  matches: Match[],
  predictions: Prediction[],
  since?: string | null,
): Standing[] {
  const sinceTime = since ? new Date(since).getTime() : null
  const finished = matches.filter(
    (m) => hasResult(m) && (sinceTime == null || new Date(m.kickoff).getTime() >= sinceTime),
  )
  const predByKey = new Map<string, Prediction>()
  for (const p of predictions) predByKey.set(`${p.participant_id}:${p.match_id}`, p)

  const standings = participants.map((part) => {
    let points = 0
    let exacts = 0
    let results = 0
    let played = 0
    for (const match of finished) {
      const pred = predByKey.get(`${part.id}:${match.id}`)
      const s = scoreFor(pred, match)
      if (s == null) continue
      played++
      points += s
      if (s === 10) exacts++
      else if (s === 5) results++
    }
    return { participant_id: part.id, name: part.name, points, exacts, results, played }
  })

  return standings.sort(
    (a, b) => b.points - a.points || b.exacts - a.exacts || b.results - a.results || a.name.localeCompare(b.name),
  )
}

/** Posições com empate compartilhado (1, 2, 2, 4...). */
export function withRanks(standings: Standing[]): (Standing & { rank: number })[] {
  const out: (Standing & { rank: number })[] = []
  standings.forEach((s, i) => {
    let rank = i + 1
    if (i > 0) {
      const prev = standings[i - 1]
      const tie = s.points === prev.points && s.exacts === prev.exacts && s.results === prev.results
      if (tie) rank = out[i - 1].rank
    }
    out.push({ ...s, rank })
  })
  return out
}
