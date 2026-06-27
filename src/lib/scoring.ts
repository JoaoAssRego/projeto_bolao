import type { Match, Prediction } from './types'
import type { SnapshotEntry } from './rankingSnapshot'

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
 *  - 7 pts: diferença de gols exata (saldo certo, não é empate).
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

  const predDiff = pred.home_score - pred.away_score
  const realDiff = (match.home_score as number) - (match.away_score as number)
  // Saldo exato: mesma margem de vitória, não serve para empate (saldo 0 = acertar resultado)
  if (predDiff !== 0 && predDiff === realDiff) return 7

  if (match.stage === 'group') {
    const predSign = Math.sign(predDiff)
    const realSign = Math.sign(realDiff)
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
  margins: number // nº de acertos de saldo (7 pts)
  results: number // nº de acertos de resultado (5 pts)
  played: number // jogos com resultado já lançado
}

/**
 * Monta a classificação geral.
 * Desempate: pontos > cravadas > saldos > acertos de resultado (depois empata mesmo).
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
    let margins = 0
    let results = 0
    let played = 0
    for (const match of finished) {
      const pred = predByKey.get(`${part.id}:${match.id}`)
      const s = scoreFor(pred, match)
      if (s == null) continue
      played++
      points += s
      if (s === 10) exacts++
      else if (s === 7) margins++
      else if (s === 5) results++
    }
    return { participant_id: part.id, name: part.name, points, exacts, margins, results, played }
  })

  return standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.exacts - a.exacts ||
      b.margins - a.margins ||
      b.results - a.results ||
      a.name.localeCompare(b.name),
  )
}

/**
 * Delta de posição entre o ranking atual e um snapshot anterior.
 * Retorna um map de participantId → variação (positivo = subiu, negativo = desceu).
 */
export function computeRankingDelta(
  current: (Standing & { rank: number })[],
  snapshot: SnapshotEntry[],
): Map<string, number> {
  const prev = new Map(snapshot.map((e) => [e.participantId, e.position]))
  const out = new Map<string, number>()
  for (const r of current) {
    const p = prev.get(r.participant_id)
    if (p != null) out.set(r.participant_id, p - r.rank)
  }
  return out
}

/**
 * Retorna o conjunto de IDs de participantes que acertaram todos os jogos
 * do último dia (BRT) com resultado lançado.
 */
export function getPerfectRoundParticipants(
  participants: { id: string }[],
  matches: Match[],
  predictions: Prediction[],
): Set<string> {
  const finished = matches.filter(hasResult)
  if (finished.length === 0) return new Set()

  const dayFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dayOf = (kickoff: string) => dayFmt.format(new Date(kickoff))

  const days = finished.map((m) => dayOf(m.kickoff)).sort()
  const latestDay = days[days.length - 1]
  const dayMatches = finished.filter((m) => dayOf(m.kickoff) === latestDay)

  const predByKey = new Map<string, Prediction>()
  for (const p of predictions) predByKey.set(`${p.participant_id}:${p.match_id}`, p)

  const perfect = new Set<string>()
  for (const part of participants) {
    const allCorrect = dayMatches.every((m) => {
      const s = scoreFor(predByKey.get(`${part.id}:${m.id}`), m)
      return s != null && s > 0
    })
    if (allCorrect) perfect.add(part.id)
  }
  return perfect
}

/** Posições com empate compartilhado (1, 2, 2, 4...). */
export function withRanks(standings: Standing[]): (Standing & { rank: number })[] {
  const out: (Standing & { rank: number })[] = []
  standings.forEach((s, i) => {
    let rank = i + 1
    if (i > 0) {
      const prev = standings[i - 1]
      const tie =
        s.points === prev.points &&
        s.exacts === prev.exacts &&
        s.margins === prev.margins &&
        s.results === prev.results
      if (tie) rank = out[i - 1].rank
    }
    out.push({ ...s, rank })
  })
  return out
}
