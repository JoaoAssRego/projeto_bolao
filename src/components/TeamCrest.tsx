import { getFlag } from '../lib/countryFlags'
import { useTeamCrest } from '../lib/teamCrest'

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
export default function TeamCrest({ teamId, code, name, size, className }: Props) {
  const crest = useTeamCrest(teamId)

  if (crest) {
    return (
      <img
        src={crest}
        alt={name ?? ''}
        width={size}
        height={size}
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
