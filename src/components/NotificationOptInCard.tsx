import { usePushNotifications } from "../lib/pushNotifications";
import { useAuth } from "../data/auth";

export default function NotificationOptInCard() {
  const { me } = useAuth();
  const { showCard, subscribe, dismiss } = usePushNotifications(me?.id ?? null);

  if (!showCard) return null;

  return (
    <div
      className="rounded-2xl p-4 mb-4 flex items-start gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      role="region"
      aria-label="Ativar notificações"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        aria-hidden="true"
      >
        🔔
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: "var(--t1)" }}>
          Ativar lembretes de palpite
        </p>
        <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>
          Avisamos quando um jogo está prestes a fechar e você ainda não palpitou.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={subscribe}
            className="px-4 py-2 rounded-xl font-semibold text-sm"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Ativar
          </button>
          <button
            onClick={dismiss}
            className="px-4 py-2 rounded-xl font-semibold text-sm"
            style={{ color: "var(--t3)" }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
