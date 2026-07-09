import { useState } from 'react'
import { getFlag } from '../lib/countryFlags'
import { crestUrl } from '../lib/teamCrest'

interface Props {
  teamId: number | null | undefined
  code: string | null | undefined
  name: string | null | undefined
  size: number
  className?: string
}

// Escudo real do clube (Libertadores/Copa do Brasil, via BSD) quando
// disponível; cai na bandeira de país (Copa do Mundo) ou no emoji genérico
// 🏴 (demais times de clube) do jeito que já funcionava antes.
//
// Exibição simples em <img>, sem crossOrigin: a BSD não manda
// Access-Control-Allow-Origin (confirmado ao vivo), mas isso só importa pra
// quem precisa rasterizar a imagem em canvas (ver ShareCardCanvas.tsx) — pra
// só desenhar na tela, um <img src> comum funciona sem CORS nenhum.
export default function TeamCrest({ teamId, code, name, size, className }: Props) {
  const url = crestUrl(teamId)
  const [failed, setFailed] = useState(false)

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={`object-contain flex-shrink-0 ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    )
  }

  const flag = getFlag(code, name)
  return (
    <span className={`leading-none flex-shrink-0 ${className ?? ''}`} style={{ fontSize: size }}>
      {flag ?? '🏴'}
    </span>
  )
}
