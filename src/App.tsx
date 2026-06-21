import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './data/auth'
import { useStore } from './data/store'
import Entrada from './screens/Entrada'
import Jogos from './screens/Jogos'
import Classificacao from './screens/Classificacao'
import MeusPalpites from './screens/MeusPalpites'
import Admin from './screens/Admin'

export default function App() {
  const { loading, configured } = useStore()

  if (!configured) return <ConfigFaltando />
  if (loading) return <TelaCarregando />

  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}

function Shell() {
  const { sessionId, me } = useAuth()
  if (!sessionId) return <Entrada />

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <Header />
      <main className="flex-1 px-4 pb-24 pt-2">
        <Routes>
          <Route path="/" element={<Jogos />} />
          <Route path="/ranking" element={<Classificacao />} />
          <Route path="/meus" element={<MeusPalpites />} />
          <Route path="/admin" element={me?.is_admin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav isAdmin={Boolean(me?.is_admin)} />
    </div>
  )
}

function Header() {
  const { me, signOut } = useAuth()
  return (
    <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-emerald-900/60 bg-[#04140a]/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <span className="font-bold tracking-tight">Bolão da Copa</span>
      </div>
      <button onClick={signOut} className="text-xs text-emerald-300/70 active:text-emerald-200">
        {me?.name} · sair
      </button>
    </header>
  )
}

function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const items = [
    { to: '/', label: 'Jogos', icon: '⚽' },
    { to: '/ranking', label: 'Ranking', icon: '🏆' },
    { to: '/meus', label: 'Meus', icon: '📋' },
  ]
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', icon: '🛠️' })

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-emerald-900/60 bg-[#04140a]/95 backdrop-blur">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
              isActive ? 'text-canarinho-yellow' : 'text-emerald-200/60'
            }`
          }
        >
          <span className="text-lg">{it.icon}</span>
          {it.label}
        </NavLink>
      ))}
    </nav>
  )
}

function TelaCarregando() {
  return (
    <div className="flex min-h-screen items-center justify-center text-emerald-300/70">
      <div className="animate-pulse">Carregando…</div>
    </div>
  )
}

function ConfigFaltando() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-sm">
      <h1 className="text-xl font-bold text-canarinho-yellow">Falta configurar o Supabase</h1>
      <p className="text-emerald-100/80">
        Copie o arquivo <code className="rounded bg-emerald-950 px-1">.env.example</code> para{' '}
        <code className="rounded bg-emerald-950 px-1">.env</code> e preencha as duas variáveis com os dados do seu
        projeto Supabase (Project Settings → API). Depois reinicie o <code className="rounded bg-emerald-950 px-1">npm run dev</code>.
      </p>
    </div>
  )
}
