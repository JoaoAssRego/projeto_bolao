import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Bottom-sheet padrão do app: usado em Ligas (criar/gerenciar liga, convites) e
// no seletor de torneio. Reaproveitar em vez de inventar um novo padrão de
// overlay por tela.
//
// Renderizado via portal direto no <body>: se o Modal for aberto por algo
// aninhado dentro de um elemento com backdrop-filter/transform (ex: o Header,
// que usa backdrop-blur-md), esse ancestral passaria a ser o "containing
// block" de um `position: fixed` normal, e o bottom-sheet abriria encaixado
// na caixinha do Header em vez de cobrir a tela inteira. O portal evita isso
// incondicionalmente, não só para o caso de hoje.
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-[var(--t1)]">{title}</h2>
          <button onClick={onClose} className="text-lg text-[var(--t3)] active:text-[var(--t1)]">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
