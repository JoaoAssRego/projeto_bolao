import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useStore } from '../data/store'

// Rótulo discreto no Header (ao lado do wordmark "Bolão"), não uma barra fixa
// separada. Fica invisível com um só torneio ativo — o caso de hoje — e some
// também no detalhe de um jogo específico: trocar de torneio ali faria o
// próprio jogo em tela sumir da lista filtrada.
//
// Abre como uma gaveta que desce do Header: sem esmaecer o fundo, flutuando
// sobre o conteúdo (não empurra o layout). Renderizado via portal em <body> —
// o Header tem backdrop-blur-md, que criaria um containing block errado para
// qualquer posicionamento fixed/absolute aninhado dentro dele.
//
// A gaveta fica sempre montada no DOM (visível/invisível via opacity+scale,
// não via montar/desmontar) — isso evita depender de requestAnimationFrame
// pra disparar a transição de entrada, algo frágil em abas em segundo plano
// ou em ambientes que não rodam um ciclo de pintura contínuo.
export default function TorneioSelector() {
  const { torneios, activeTorneioId, setActiveTorneioId } = useStore()
  const location = useLocation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [drawerTop, setDrawerTop] = useState(0)

  const emJogoDetalhes = /^\/jogo\//.test(location.pathname)
  const enabled = torneios.length >= 2 && !emJogoDetalhes

  useLayoutEffect(() => {
    if (!open) return
    const header = triggerRef.current?.closest('header')
    if (header) setDrawerTop(header.getBoundingClientRect().bottom)
  }, [open])

  if (!enabled) return null

  const active = torneios.find((t) => t.id === activeTorneioId)

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[13px] font-semibold text-[var(--t2)] transition-colors active:text-[var(--t1)]"
      >
        <span className="text-[var(--t3)]">·</span>
        <span className="max-w-[160px] truncate">{active?.nome ?? 'Torneio'}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--t3)] transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {createPortal(
        <>
          {/* Catch-all invisível: fecha a gaveta ao tocar fora, sem escurecer nada */}
          <div
            className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 z-50 pointer-events-none" style={{ top: drawerTop }}>
            <div className="mx-auto max-w-md px-4">
              <div
                className={`origin-top rounded-b-2xl border border-t-0 border-[var(--border)] bg-[var(--bg)] p-2 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:duration-0 ${
                  open ? 'pointer-events-auto scale-y-100 opacity-100' : 'scale-y-95 opacity-0'
                }`}
              >
                <ul className="flex flex-col gap-1">
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
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
