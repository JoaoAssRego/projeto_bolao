import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import MatchCard from '../components/MatchCard'
import { isLocked } from '../lib/scoring'
import { dayKey, todayKey } from '../lib/format'
import type { Match } from '../lib/types'

export default function Jogos() {
  const { matches, predictions, participants, savePrediction } = useStore()
  const { me } = useAuth()
  const [tab, setTab] = useState<'abertos' | 'encerrados'>('abertos')

  const sorted = useMemo(
    () => [...matches].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()),
    [matches],
  )

  const abertos = sorted.filter((m) => !isLocked(m))
  const encerrados = sorted.filter((m) => isLocked(m)).reverse() // mais recentes primeiro

  // Aviso "você ainda não palpitou nos jogos de hoje"
  const hoje = todayKey()
  const pendentesHoje = useMemo(() => {
    if (!me) return [] as Match[]
    return abertos.filter(
      (m) =>
        dayKey(m.kickoff) === hoje &&
        m.home_team &&
        m.away_team &&
        !predictions.some((p) => p.match_id === m.id && p.participant_id === me.id),
    )
  }, [abertos, predictions, me, hoje])

  const lista = tab === 'abertos' ? abertos : encerrados

  if (!me) return null

  return (
    <div className="flex flex-col gap-3">
      {pendentesHoje.length > 0 && (
        <div className="rounded-xl border border-canarinho-yellow/40 bg-canarinho-yellow/10 px-4 py-3 text-sm text-canarinho-yellow">
          ⚠️ Você ainda não palpitou em {pendentesHoje.length}{' '}
          {pendentesHoje.length === 1 ? 'jogo de hoje' : 'jogos de hoje'}. Corre antes de travar!
        </div>
      )}

      <div className="flex rounded-xl bg-emerald-950/60 p-1 text-sm font-semibold">
        <button
          onClick={() => setTab('abertos')}
          className={`flex-1 rounded-lg py-2 ${tab === 'abertos' ? 'bg-emerald-800 text-white' : 'text-emerald-300/60'}`}
        >
          Abertos ({abertos.length})
        </button>
        <button
          onClick={() => setTab('encerrados')}
          className={`flex-1 rounded-lg py-2 ${tab === 'encerrados' ? 'bg-emerald-800 text-white' : 'text-emerald-300/60'}`}
        >
          Travados ({encerrados.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-sm text-emerald-300/50">
          {tab === 'abertos' ? 'Nenhum jogo aberto para palpitar agora.' : 'Nenhum jogo travado ainda.'}
        </p>
      ) : (
        lista.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            me={me}
            participants={participants}
            predictions={predictions.filter((p) => p.match_id === m.id)}
            onSave={(h, a) => savePrediction(me.id, m.id, h, a)}
          />
        ))
      )}
    </div>
  )
}
