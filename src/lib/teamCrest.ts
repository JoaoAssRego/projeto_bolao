import { useEffect, useState } from 'react'

// Endpoint público de imagem da BSD Football API (sem autenticação, cache de
// 1 ano). Indexado pelo mesmo team_id numérico que sync-resultados-bsd já
// persiste em matches.home_team_id/away_team_id. 404 quando a BSD não tem
// escudo daquele time.
export function crestUrl(teamId: number | null | undefined): string | null {
  if (teamId == null) return null
  return `https://sports.bzzoiro.com/img/team/${teamId}/?bg=transparent`
}

// Cache em módulo: cada team_id só é sondado uma vez (evita repetir o
// preload em cada card/tela que mostra o mesmo clube).
const cache = new Map<number, string | null>()
const inFlight = new Map<number, Promise<string | null>>()

function probe(teamId: number, url: string): Promise<string | null> {
  const existing = inFlight.get(teamId)
  if (existing) return existing

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image()
    // crossOrigin='anonymous' faz o navegador falhar o load (onerror) quando
    // a BSD não manda Access-Control-Allow-Origin, em vez de entregar uma
    // imagem "tainted" que quebraria a exportação do card de compartilhamento
    // (toPng via html-to-image). Isso garante que só promovemos a URL real
    // quando ela é segura de rasterizar em canvas.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  }).then((result) => {
    cache.set(teamId, result)
    inFlight.delete(teamId)
    return result
  })

  inFlight.set(teamId, promise)
  return promise
}

// Resolve a URL do escudo de um clube, ou null se não houver (sem id, 404,
// ou bloqueado por CORS). Só chama a rede uma vez por team_id.
export function useTeamCrest(teamId: number | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    teamId != null ? cache.get(teamId) ?? null : null,
  )

  useEffect(() => {
    if (teamId == null) {
      setResolved(null)
      return
    }
    if (cache.has(teamId)) {
      setResolved(cache.get(teamId) ?? null)
      return
    }
    const url = crestUrl(teamId)
    if (!url) return
    let cancelled = false
    probe(teamId, url).then((result) => {
      if (!cancelled) setResolved(result)
    })
    return () => {
      cancelled = true
    }
  }, [teamId])

  return resolved
}
