import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./data/auth";
import { useStore } from "./data/store";
import { isLocked } from "./lib/scoring";
import type { Participant } from "./lib/types";
import { supabase } from "./lib/supabase";
import Entrada from "./screens/Entrada";
import ConviteRoute from "./screens/Convite";
import Home from "./screens/Home";
import Jogos from "./screens/Jogos";
import Ligas from "./screens/Ligas";
import MeusPalpites from "./screens/MeusPalpites";
import Admin from "./screens/Admin";
import JogoDetalhes from "./screens/JogoDetalhes";

export default function App() {
  const { loading, configured } = useStore();

  if (!configured) return <ConfigFaltando />;
  if (loading) return <TelaCarregando />;

  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { me, loading: authLoading, recoveryMode } = useAuth();
  if (authLoading) return <TelaCarregando />;
  if (recoveryMode) return <TrocarSenhaRecuperacao />;

  return (
    <Routes>
      <Route path="/convite/:token" element={<ConviteRoute />} />
      <Route path="/*" element={me ? <AppAutenticado /> : <Entrada />} />
    </Routes>
  );
}

function AppAutenticado() {
  const { me } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <Header />
      {me && <EmailCadastroCard me={me} />}
      <main className="flex-1 px-4 pb-24 pt-2">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jogos" element={<Jogos />} />
          <Route path="/ligas" element={<Ligas />} />
          <Route path="/meus" element={<MeusPalpites />} />
          <Route path="/jogo/:id" element={<JogoDetalhes />} />
          <Route
            path="/admin"
            element={me?.is_admin ? <Admin /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav isAdmin={Boolean(me?.is_admin)} />
    </div>
  );
}

// ─── Card de cadastro de email ───────────────────────────────────────────────

const EMAIL_DISMISSED_KEY = "bolao.email-card-dismissed";

function EmailCadastroCard({ me }: { me: Participant }) {
  const { participants, updateParticipantEmail } = useStore();
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem(EMAIL_DISMISSED_KEY);
    return ts ? Date.now() - parseInt(ts) < 7 * 24 * 60 * 60 * 1000 : false;
  });
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Verifica se o participante já tem email registrado (usando lista do store,
  // que é atualizada após updateParticipantEmail → refresh).
  const myRecord = participants.find((p) => p.id === me.id);
  const hasEmail = Boolean(myRecord?.email || me.email);

  if (dismissed || hasEmail || done) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(EMAIL_DISMISSED_KEY, String(Date.now()));
  }

  async function handleSave() {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) return;
    setBusy(true);
    setErr(null);
    try {
      await updateParticipantEmail(me.id, email);
      setDone(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("already") || msg.includes("taken"))
        setErr("Esse email já está em uso. Tente outro.");
      else setErr("Não consegui salvar. Verifique o email e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-4 mt-2 rounded-xl border border-[var(--accent-ring)] bg-[var(--accent-muted)] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--t1)]">
          Cadastre um email de recuperação
        </p>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 text-lg leading-none text-[var(--t3)] transition-colors active:text-[var(--t1)]"
        >
          ×
        </button>
      </div>
      <p className="mt-0.5 text-xs text-[var(--t2)]">
        Se um dia esquecer sua senha, poderá recuperar pelo email.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-fg)]"
        >
          Adicionar email
        </button>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="seu@email.com"
            className="flex-1 min-w-0 rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--t1)] outline-none ring-[var(--accent)] placeholder:text-[var(--t3)] focus:ring-2"
          />
          <button
            onClick={handleSave}
            disabled={busy || !emailInput.trim() || !emailInput.includes("@")}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-fg)] disabled:opacity-50"
          >
            {busy ? "…" : "Salvar"}
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}

// ─── Tela de redefinição via link de email (PASSWORD_RECOVERY) ────────────────

const inputRecoveryCls =
  "rounded-xl bg-[var(--surface)] px-4 py-3 text-lg text-[var(--t1)] outline-none ring-[var(--accent)] placeholder:text-[var(--t3)] focus:ring-2";

function TrocarSenhaRecuperacao() {
  const { clearRecovery } = useAuth();
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => clearRecovery(), 2000);
      return () => clearTimeout(t);
    }
  }, [done, clearRecovery]);

  async function handleSubmit() {
    if (newPass.length < 4 || newPass !== confirm) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setDone(true);
    } catch {
      setErr("Não consegui redefinir. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-[var(--t1)] text-lg font-semibold">
          Senha redefinida! Redirecionando…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <img src="/icon.svg" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[var(--t1)]">
          Nova senha
        </h1>
        <p className="mt-1 text-sm text-[var(--t2)]">
          Escolha uma nova senha para sua conta.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="Nova senha (mín. 4 caracteres)"
          className={inputRecoveryCls}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Confirmar nova senha"
          className={inputRecoveryCls}
        />
        {newPass && confirm && newPass !== confirm && (
          <p className="text-sm text-red-400">As senhas não coincidem.</p>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          onClick={handleSubmit}
          disabled={busy || newPass.length < 4 || newPass !== confirm}
          className="rounded-2xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-all disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
        >
          {busy ? "Salvando…" : "Definir nova senha"}
        </button>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const { me, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initial = me?.name?.trim()[0]?.toUpperCase() ?? "?";
  const firstName = me?.name?.trim().split(/\s+/)[0] ?? "";

  return (
    <header
      className={`safe-top sticky top-0 z-10 flex items-center justify-between bg-[var(--bg)] px-4 pb-3.5 backdrop-blur-md transition-colors duration-200 ${
        scrolled ? "border-b border-[var(--border)]" : "border-b border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="h-6 w-6" />
        <span className="font-bold tracking-tight text-[var(--t1)]">Bolão</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--raised)] py-1 pl-1 pr-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold leading-none text-[var(--accent-fg)]">
            {initial}
          </span>
          <span className="max-w-[80px] truncate text-[11px] font-semibold text-[var(--t2)]">
            {firstName}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--raised)] text-[var(--t3)] transition-colors active:bg-[var(--border)] active:text-[var(--t1)]"
          aria-label="Sair"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const { me } = useAuth();
  const { leagueMembers, matches, predictions } = useStore();

  const pendingCount = useMemo(
    () =>
      me
        ? leagueMembers.filter(
            (m) => m.participant_id === me.id && m.status === "pending",
          ).length
        : 0,
    [leagueMembers, me],
  );

  const unpredictedCount = useMemo(() => {
    if (!me) return 0;
    const brtDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const today = brtDay.format(new Date());
    return matches.filter(
      (m) =>
        brtDay.format(new Date(m.kickoff)) === today &&
        !isLocked(m) &&
        m.home_team &&
        m.away_team &&
        !predictions.some(
          (p) => p.match_id === m.id && p.participant_id === me.id,
        ),
    ).length;
  }, [matches, predictions, me]);

  const items = [
    { to: "/", label: "Início", icon: "🏅", badge: 0 },
    { to: "/ligas", label: "Liga", icon: "🏆", badge: pendingCount },
    { to: "/jogos", label: "Jogos", icon: "⚽", badge: unpredictedCount },
    { to: "/meus", label: "Meus", icon: "📋", badge: 0 },
  ];
  if (isAdmin)
    items.push({ to: "/admin", label: "Admin", icon: "🛠️", badge: 0 });

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-[var(--border)] bg-[oklch(20%_0.030_155_/_0.96)] backdrop-blur">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
              isActive ? "text-[var(--accent)]" : "text-[var(--t3)]"
            }`
          }
        >
          <span className="relative text-lg">
            {it.icon}
            {it.badge > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {it.badge}
              </span>
            )}
          </span>
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}

// ─── Telas utilitárias ────────────────────────────────────────────────────────

function TelaCarregando() {
  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--t3)]">
      <div className="animate-pulse">Carregando…</div>
    </div>
  );
}

function ConfigFaltando() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-sm">
      <h1 className="text-xl font-bold text-[var(--accent)]">
        Falta configurar o Supabase
      </h1>
      <p className="text-[var(--t2)]">
        Copie o arquivo{" "}
        <code className="rounded bg-[var(--raised)] px-1">.env.example</code>{" "}
        para <code className="rounded bg-[var(--raised)] px-1">.env</code> e
        preencha as duas variáveis com os dados do seu projeto Supabase (Project
        Settings → API). Depois reinicie o{" "}
        <code className="rounded bg-[var(--raised)] px-1">npm run dev</code>.
      </p>
    </div>
  );
}
