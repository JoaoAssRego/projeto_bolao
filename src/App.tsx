import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./data/auth";
import { useStore } from "./data/store";
import { isLocked } from "./lib/scoring";
import Entrada from "./screens/Entrada";
import ConviteRoute from "./screens/Convite";
import Home from "./screens/Home";
import Jogos from "./screens/Jogos";
import Ligas from "./screens/Ligas";
import MeusPalpites from "./screens/MeusPalpites";
import Admin from "./screens/Admin";

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
  const { me, loading: authLoading } = useAuth();
  if (authLoading) return <TelaCarregando />;

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
      <main className="flex-1 px-4 pb-24 pt-2">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jogos" element={<Jogos />} />
          <Route path="/ligas" element={<Ligas />} />
          <Route path="/meus" element={<MeusPalpites />} />
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
      className={`safe-top sticky top-0 z-10 flex items-center justify-between bg-[var(--bg)] px-4 py-3.5 backdrop-blur-md transition-colors duration-200 ${
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
