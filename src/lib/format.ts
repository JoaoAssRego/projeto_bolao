// Tudo exibido em horário de Brasília.
const TZ = 'America/Sao_Paulo'

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
})

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
})

const dayKeyFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatKickoff(iso: string): string {
  const d = new Date(iso)
  return `${dateFmt.format(d)} · ${timeFmt.format(d)}`
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

/** Chave de dia (dd/mm/aaaa em Brasília) — usada para agrupar e detectar "hoje". */
export function dayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso))
}

export function todayKey(now: Date = new Date()): string {
  return dayKeyFmt.format(now)
}

// ---- Conversão para o campo <input type="datetime-local"> (sempre em Brasília) ----

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** ISO -> "YYYY-MM-DDTHH:mm" no horário de Brasília (para preencher o input). */
export function toInputValue(iso: string): string {
  const parts = partsFmt.formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** "YYYY-MM-DDTHH:mm" (interpretado como Brasília) -> ISO com offset -03:00. */
export function fromInputValue(value: string): string {
  return new Date(`${value}:00-03:00`).toISOString()
}
