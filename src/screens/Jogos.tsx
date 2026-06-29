import { useMemo, useState, useRef, useEffect } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'
import MatchCard from '../components/MatchCard'
import PWAInstallCard from '../components/PWAInstallCard'
import { isLocked, hasResult } from '../lib/scoring'
import type { Match } from '../lib/types'

// Chave de dia YYYY-MM-DD em horário de Brasília (ordenável alfabeticamente).
const isoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function dayISO(iso: string): string {
  return isoFmt.format(new Date(iso))
}

function todayISO(): string {
  return isoFmt.format(new Date())
}

function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return isoFmt.format(d)
}

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
})

function chipLabel(key: string, today: string, tomorrow: string): string {
  if (key === today) return 'Hoje'
  if (key === tomorrow) return 'Amanhã'
  const day = parseInt(key.split('-')[2])
  // T12:00:00Z = meio-dia UTC = 9h Brasília, nunca vira o dia em nenhum fuso
  const raw = weekdayFmt.format(new Date(key + 'T12:00:00Z')).replace('.', '')
  const weekday = raw.charAt(0).toUpperCase() + raw.slice(1)
  return `${weekday} ${day}`
}

export default function Jogos() {
  const { matches, predictions, savePrediction } = useStore()
  const { me } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const today = todayISO()
  const tomorrow = tomorrowISO()

  // Agrupa jogos por dia (chave YYYY-MM-DD em Brasília)
  const { days, byDay } = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      const key = dayISO(m.kickoff)
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    }
    const days = [...map.keys()].sort()
    return { days, byDay: map }
  }, [matches])

  // Dia padrão: hoje se houver jogo ao vivo, senão próximo dia com jogo
  const defaultDay = useMemo(() => {
    const todayGames = byDay.get(today) ?? []
    if (todayGames.some((m) => isLocked(m) && !hasResult(m))) return today
    return days.find((d) => d >= today) ?? days[days.length - 1] ?? today
  }, [days, byDay, today])

  const [selectedDay, setSelectedDay] = useState(defaultDay)

  // Centraliza o chip selecionado na barra
  useEffect(() => {
    const chip = chipRefs.current.get(selectedDay)
    chip?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDay])

  // Ordenação dentro do dia: ao vivo → futuros por horário → encerrados por horário
  const lista = useMemo(() => {
    const games = byDay.get(selectedDay) ?? []
    const byTime = (a: Match, b: Match) =>
      new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()

    const live = games.filter((m) => isLocked(m) && !hasResult(m))
    const future = games.filter((m) => !isLocked(m)).sort(byTime)
    const finished = games.filter((m) => hasResult(m)).sort(byTime)

    return [...live, ...future, ...finished]
  }, [byDay, selectedDay])

  if (!me) return null

  return (
    <div className="flex flex-col gap-3">
      <PWAInstallCard />
      {/* Barra de datas deslizável */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1"
      >
        {days.map((day) => {
          const isSelected = day === selectedDay
          return (
            <button
              key={day}
              ref={(el) => {
                if (el) chipRefs.current.set(day, el)
                else chipRefs.current.delete(day)
              }}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                isSelected
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--surface)] text-[var(--t2)] hover:text-[var(--t1)]'
              }`}
            >
              {chipLabel(day, today, tomorrow)}
            </button>
          )
        })}
      </div>

      {/* Lista de jogos do dia */}
      {lista.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--t3)]">Nenhum jogo neste dia.</p>
      ) : (
        lista.map((m) => {
          const hasPrediction = predictions.some(
            (p) => p.match_id === m.id && p.participant_id === me.id,
          )
          return (
            <MatchCard
              key={m.id}
              match={m}
              me={me}
              predictions={predictions.filter((p) => p.match_id === m.id)}
              onSave={(h, a) => savePrediction(me.id, m.id, h, a)}
              hasPrediction={hasPrediction}
            />
          )
        })
      )}
    </div>
  )
}
