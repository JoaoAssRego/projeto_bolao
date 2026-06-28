export interface SnapshotEntry {
  participantId: string
  position: number
}

const PREFIX = 'ranking_snapshot_'

function getTodayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function saveSnapshot(date: string, entries: SnapshotEntry[]): void {
  try {
    localStorage.setItem(`${PREFIX}${date}`, JSON.stringify(entries))
  } catch {
    // quota excedida ou localStorage indisponível
  }
}

export function loadSnapshot(date: string): SnapshotEntry[] | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${date}`)
    if (!raw) return null
    return JSON.parse(raw) as SnapshotEntry[]
  } catch {
    return null
  }
}

/** Retorna o snapshot mais recente anterior ao dia de hoje (BRT). */
export function loadPreviousSnapshot(): { date: string; entries: SnapshotEntry[] } | null {
  const today = getTodayBRT()
  const dates: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX)) {
        const date = key.slice(PREFIX.length)
        if (date < today) dates.push(date)
      }
    }
  } catch {
    return null
  }
  if (dates.length === 0) return null
  const sorted = dates.sort()
  const latest = sorted[sorted.length - 1]
  const entries = loadSnapshot(latest)
  if (!entries) return null
  return { date: latest, entries }
}

/**
 * Salva o snapshot de hoje na primeira chamada do dia para o contexto dado.
 * `contextId` diferencia ranking global (undefined) de cada liga (leagueId).
 * Idempotente — só salva uma vez por dia por contexto.
 */
export function initTodaySnapshot(
  ranking: { participant_id: string; rank: number }[],
  contextId?: string,
): void {
  if (ranking.length === 0) return
  const key = contextId ? `${getTodayBRT()}_${contextId}` : getTodayBRT()
  if (loadSnapshot(key)) return
  saveSnapshot(
    key,
    ranking.map((r) => ({ participantId: r.participant_id, position: r.rank })),
  )
}

/** Retorna o snapshot de hoje (BRT) para o contexto dado, se existir. */
export function loadTodaySnapshot(contextId?: string): SnapshotEntry[] | null {
  const key = contextId ? `${getTodayBRT()}_${contextId}` : getTodayBRT()
  return loadSnapshot(key)
}
