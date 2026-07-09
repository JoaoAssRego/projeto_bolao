import { useEffect, useState } from 'react'

// Bump o sufixo (ex.: 2026-08-torneios) a cada novo anúncio — cada card tem
// sua própria chave, então um usuário que já dispensou este não perde o
// próximo aviso automaticamente.
const DISMISSED_KEY = 'bolao.update-2026-07-torneios-dismissed'

export default function UpdateAnnouncementCard() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) setShow(true)
  }, [])

  if (!show) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
      role="region"
      aria-label="Novidade do app"
    >
      <span className="text-xl leading-none" aria-hidden="true">🏆</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--t1)]">Novos torneios no bolão</p>
        <p className="mt-0.5 text-sm text-[var(--t2)]">
          Champions League, Libertadores e Copa do Brasil já estão liberados pra palpitar.
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="shrink-0 rounded-full p-1.5 text-[var(--t3)] transition-colors hover:text-[var(--t1)] active:bg-[var(--raised)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  )
}
