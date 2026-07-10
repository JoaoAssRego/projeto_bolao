// ─── Mini Games: escudos reais (BSD Football API) ────────────────────────────
// Mapeia nome de time (exatamente como aparece em campaignsData.ts) → team_id
// da BSD, o mesmo id que o app já usa em crestUrl()/TeamCrest. Todos os ids
// abaixo foram confirmados retornando escudo (200 image/png) em Jul/2026.
//
// Seleções (Brasil e adversários de Copa) NÃO entram aqui de propósito: usam a
// bandeira do país. Clubes sem escudo na BSD (Cobreloa, Jorge Wilstermann)
// também ficam de fora e caem na bandeira do país como fallback.

const CREST_ID: Record<string, number> = {
  // Times jogáveis
  Flamengo: 160,
  Botafogo: 163,
  Vasco: 164,
  Fluminense: 153,

  // Adversários (clubes)
  'Deportivo Cali': 3733,
  Emelec: 3698,
  Internacional: 161,
  Grêmio: 154,
  'River Plate': 755,
  'Deportes Tolima': 781,
  Corinthians: 167,
  'Vélez Sarsfield': 2397,
  'Athletico Paranaense': 371,
  Estudiantes: 787,
  'Racing Club': 733,
  Palmeiras: 162,
  'São Paulo': 158,
  Peñarol: 798,
  'Atlético Mineiro': 155,
  'Barcelona de Guayaquil': 776,
  'Argentinos Juniors': 806,
  Olimpia: 746,
  'Boca Juniors': 780,
}

export function crestIdFor(name: string | null | undefined): number | null {
  if (!name) return null
  return CREST_ID[name] ?? null
}
