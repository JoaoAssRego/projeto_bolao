import { useEffect, useState } from 'react'

// Endpoint público de imagem da BSD Football API (sem autenticação, cache de
// 1 ano). Indexado pelo mesmo team_id numérico que sync-resultados-bsd já
// persiste em matches.home_team_id/away_team_id. 404 quando a BSD não tem
// escudo daquele time. Confirmado ao vivo: NÃO manda
// Access-Control-Allow-Origin — por isso exibição normal (<img> simples) usa
// só onError (não precisa de CORS pra só desenhar na tela), e apenas o card
// de compartilhamento (que rasteriza em canvas) usa o hook CORS-safe abaixo.
export function crestUrl(teamId: number | null | undefined): string | null {
  if (teamId == null) return null
  return `https://sports.bzzoiro.com/img/team/${teamId}/?bg=transparent`
}

// Cache em módulo: cada team_id só é sondado uma vez (evita repetir o
// preload em cada card/tela que mostra o mesmo clube).
const canvasSafeCache = new Map<number, string | null>()
const inFlight = new Map<number, Promise<string | null>>()

function probe(teamId: number, url: string): Promise<string | null> {
  const existing = inFlight.get(teamId)
  if (existing) return existing

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image()
    // crossOrigin='anonymous' faz o navegador falhar o load (onerror) quando
    // a BSD não manda Access-Control-Allow-Origin — o que hoje é sempre o
    // caso (confirmado ao vivo). Então este hook sempre resolve null por
    // enquanto; é o comportamento seguro esperado até existir um proxy
    // nosso que adicione o header de CORS na resposta.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  }).then((result) => {
    canvasSafeCache.set(teamId, result)
    inFlight.delete(teamId)
    return result
  })

  inFlight.set(teamId, promise)
  return promise
}

// Resolve a URL do escudo SÓ quando é seguro rasterizar em canvas (usado
// pelo card de compartilhamento, via html-to-image). Null se não houver id,
// 404, ou (hoje, sempre) bloqueio de CORS. Não usar para exibição normal em
// <img> — use crestUrl() direto nesse caso (ver TeamCrest.tsx).
export function useCanvasSafeTeamCrest(teamId: number | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    teamId != null ? canvasSafeCache.get(teamId) ?? null : null,
  )

  useEffect(() => {
    if (teamId == null) {
      setResolved(null)
      return
    }
    if (canvasSafeCache.has(teamId)) {
      setResolved(canvasSafeCache.get(teamId) ?? null)
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
