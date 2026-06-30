import { useEffect } from 'react'

interface Props {
  onClose: () => void
}

export default function RulesModal({ onClose }: Props) {
  // Fecha com ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-base font-bold text-[var(--t1)]">Regulamento de Pontos</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--raised)] text-[var(--t2)] transition-colors hover:text-[var(--t1)] active:bg-[var(--border)]"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <p className="text-sm text-[var(--t2)] mb-4">
            A pontuação de cada palpite é calculada da seguinte forma:
          </p>

          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-12 rounded-md bg-[var(--accent)] text-[var(--accent-fg)] px-1 py-1 text-center text-xs font-bold">10 pts</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--t1)] block">Placar exato</span>
                <span className="text-xs text-[var(--t2)]">Acertou exatamente o número de gols de cada time.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-12 rounded-md bg-amber-400 text-white px-1 py-1 text-center text-xs font-bold">7 pts</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--t1)] block">Saldo de gols ou Empate</span>
                <span className="text-xs text-[var(--t2)]">Acertou o vencedor e a diferença de gols, ou acertou que seria empate.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-12 rounded-md bg-[var(--ok)] text-[var(--ok-fg)] px-1 py-1 text-center text-xs font-bold">5 pts</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--t1)] block">Vencedor</span>
                <span className="text-xs text-[var(--t2)]">Acertou apenas quem ganhou a partida.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-12 rounded-md bg-[var(--raised)] text-[var(--t3)] px-1 py-1 text-center text-xs font-bold">0 pts</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--t1)] block">Erro</span>
                <span className="text-xs text-[var(--t2)]">Não acertou o vencedor nem o empate.</span>
              </div>
            </li>
          </ul>

          <div className="mt-5 pt-4 border-t border-[var(--border)]">
            <h3 className="text-sm font-bold text-[var(--t1)] mb-3">Critérios de Desempate</h3>
            <ol className="flex flex-col gap-2 text-sm text-[var(--t2)]">
              <li className="flex gap-2">
                <span className="font-bold text-[var(--t3)]">1.</span>
                <span>Mais palpites com placar exato (cravadas).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[var(--t3)]">2.</span>
                <span>Mais palpites com saldo correto ou empate (7 pts).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[var(--t3)]">3.</span>
                <span>Mais palpites com acerto de resultado simples (5 pts).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[var(--t3)]">4.</span>
                <span>Sorteio ou posição compartilhada.</span>
              </li>
            </ol>
          </div>
        </div>

        <div className="border-t border-[var(--border)] p-4 bg-[var(--raised)] mt-auto">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-[var(--accent-fg)] transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
