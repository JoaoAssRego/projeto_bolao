import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../data/store'
import Modal from './Modal'

// Rótulo discreto no Header (ao lado do wordmark "Bolão"), não uma barra fixa
// separada. Fica invisível com um só torneio ativo — o caso de hoje — e some
// também no detalhe de um jogo específico: trocar de torneio ali faria o
// próprio jogo em tela sumir da lista filtrada.
export default function TorneioSelector() {
  const { torneios, activeTorneioId, setActiveTorneioId } = useStore()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const emJogoDetalhes = /^\/jogo\//.test(location.pathname)
  if (torneios.length < 2 || emJogoDetalhes) return null

  const active = torneios.find((t) => t.id === activeTorneioId)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[13px] font-semibold text-[var(--t2)] transition-colors active:text-[var(--t1)]"
      >
        <span className="text-[var(--t3)]">·</span>
        <span className="max-w-[160px] truncate">{active?.nome ?? 'Torneio'}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--t3)]">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <Modal title="Trocar torneio" onClose={() => setOpen(false)}>
          <ul className="flex flex-col gap-1.5">
            {torneios.map((t) => {
              const isActive = t.id === activeTorneioId
              return (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      setActiveTorneioId(t.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--raised)] text-[var(--t2)] active:bg-[var(--border)]'
                    }`}
                  >
                    {t.nome}
                    {isActive && <span aria-hidden>✓</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </Modal>
      )}
    </>
  )
}
