import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../data/auth'
import { usePushNotifications } from '../lib/pushNotifications'

// Gaveta que desce do Header, ancorada no avatar (mesmo padrão do
// TorneioSelector: portal em <body>, sempre montada, visibilidade via
// opacity/scale). Reúne "Ativar notificações" e "Sair" num único ponto fixo —
// diferente do NotificationOptInCard, que é um convite pontual e dispensável.
export default function ProfileMenu() {
  const { me, signOut } = useAuth()
  const navigate = useNavigate()
  const { subscribed, supported, busy, error, subscribe } = usePushNotifications(me?.id ?? null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 16 })

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const header = trigger?.closest('header')
    if (!trigger || !header) return
    const triggerRect = trigger.getBoundingClientRect()
    setPos({
      top: header.getBoundingClientRect().bottom,
      right: window.innerWidth - triggerRect.right,
    })
  }, [open])

  const initial = me?.name?.trim()[0]?.toUpperCase() ?? '?'
  const firstName = me?.name?.trim().split(/\s+/)[0] ?? ''

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--raised)] py-1 pl-1 pr-2.5 transition-colors active:bg-[var(--border)]"
        aria-label="Menu do perfil"
        aria-expanded={open}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold leading-none text-[var(--accent-fg)]">
          {initial}
        </span>
        <span className="max-w-[80px] truncate text-[11px] font-semibold text-[var(--t2)]">
          {firstName}
        </span>
      </button>

      {createPortal(
        <>
          <div
            className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-50 pointer-events-none"
            style={{ top: pos.top, right: pos.right }}
          >
            <div
              className={`w-64 origin-top-right rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2 shadow-lg transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:duration-0 ${
                open ? 'pointer-events-auto scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
            >
              <p className="truncate px-3 pb-1 pt-1.5 text-sm font-semibold text-[var(--t1)]">
                {me?.name}
              </p>

              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/meus')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--t2)] transition-colors active:bg-[var(--raised)]"
              >
                <span aria-hidden>📋</span>
                <span className="flex-1 text-left">Meus palpites</span>
              </button>

              {supported && (
                <button
                  onClick={subscribe}
                  disabled={subscribed || busy}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    subscribed ? '' : 'text-[var(--t2)] active:bg-[var(--raised)]'
                  }`}
                  style={subscribed ? { color: 'var(--ok, #22c55e)' } : undefined}
                >
                  <span aria-hidden>{subscribed ? '🔔' : '🔕'}</span>
                  <span className="flex-1 text-left">
                    {subscribed
                      ? 'Notificações ativadas'
                      : busy
                        ? 'Ativando...'
                        : 'Ativar notificações'}
                  </span>
                  {subscribed && <span aria-hidden>✓</span>}
                </button>
              )}
              {error && (
                <p className="px-3 pb-2 text-xs" style={{ color: 'var(--danger, #ef4444)' }}>
                  {error}
                </p>
              )}

              <button
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--t2)] transition-colors active:bg-[var(--raised)]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16,17 21,12 16,7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
