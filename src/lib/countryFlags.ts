const SUBDIVISION_FLAGS: Record<string, string> = {
  GBENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  GBSCT: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  GBWLS: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

export function getFlag(isoCode: string | null | undefined): string | null {
  if (!isoCode) return null
  const code = isoCode.toUpperCase().trim()
  if (SUBDIVISION_FLAGS[code]) return SUBDIVISION_FLAGS[code]
  if (!/^[A-Z]{2}$/.test(code)) return null
  return String.fromCodePoint(
    0x1f1e6 + code.charCodeAt(0) - 65,
    0x1f1e6 + code.charCodeAt(1) - 65,
  )
}
