import { usePWAInstall } from "../lib/usePWAInstall";

const BENEFITS = [
  { icon: "⚡", text: "Acesso rápido sem abrir o navegador" },
  { icon: "📺", text: "Tela cheia sem a barra do browser" },
  { icon: "🔔", text: "Receba notificações de novos jogos" },
];

export default function PWAInstallCard() {
  const { showCard, isIOS, install, dismiss } = usePWAInstall();

  if (!showCard) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden="true" />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-5 pt-5 pb-8 safe-bottom"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Instalar aplicativo"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              aria-hidden="true"
            >
              ⚽
            </div>
            <div>
              <p
                className="font-semibold text-base"
                style={{ color: "var(--t1)" }}
              >
                Bolão
              </p>
              <p className="text-sm" style={{ color: "var(--t2)" }}>
                Instalar na tela inicial
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-full"
            style={{ color: "var(--t3)" }}
            aria-label="Fechar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Benefits */}
        <ul className="flex flex-col gap-2.5 mb-5">
          {BENEFITS.map(({ icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 text-sm"
              style={{ color: "var(--t2)" }}
            >
              <span className="text-base" aria-hidden="true">
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isIOS ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: "var(--raised)", color: "var(--t2)" }}
          >
            <p className="font-medium mb-3" style={{ color: "var(--t1)" }}>
              Como instalar no iPhone:
            </p>
            <ol className="flex flex-col gap-2">
              <li className="flex items-center gap-2">
                <span
                  className="font-mono text-xs w-4"
                  style={{ color: "var(--t3)" }}
                >
                  1.
                </span>
                <span>Toque no ícone de compartilhar</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="ícone de compartilhar"
                  className="shrink-0"
                  style={{ color: "var(--accent)" }}
                >
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="font-mono text-xs w-4"
                  style={{ color: "var(--t3)" }}
                >
                  2.
                </span>
                <span>
                  Selecione{" "}
                  <strong style={{ color: "var(--t1)" }}>
                    "Adicionar à Tela Inicial"
                  </strong>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="font-mono text-xs w-4"
                  style={{ color: "var(--t3)" }}
                >
                  3.
                </span>
                <span>
                  Toque em{" "}
                  <strong style={{ color: "var(--t1)" }}>"Adicionar"</strong>
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <button
            onClick={install}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Instalar
          </button>
        )}
      </div>
    </>
  );
}
