import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { clearSession, getSession, setSession } from '../lib/session'
import { useStore } from './store'
import type { Participant } from '../lib/types'

interface AuthValue {
  me: Participant | null // registro completo (inclui is_admin), quando carregado
  sessionId: string | null // id salvo no aparelho (pode estar antes de carregar)
  signIn: (participant: { id: string; name: string }) => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { participants } = useStore()
  const [sessionId, setSessionId] = useState<string | null>(() => getSession()?.id ?? null)

  const me = useMemo(
    () => participants.find((p) => p.id === sessionId) ?? null,
    [participants, sessionId],
  )

  // Se a sessão aponta para alguém que não existe mais (ex: removido), limpa.
  useEffect(() => {
    if (sessionId && participants.length > 0 && !me) {
      clearSession()
      setSessionId(null)
    }
  }, [sessionId, participants, me])

  const value = useMemo<AuthValue>(
    () => ({
      me,
      sessionId,
      signIn: (p) => {
        setSession({ id: p.id, name: p.name })
        setSessionId(p.id)
      },
      signOut: () => {
        clearSession()
        setSessionId(null)
      },
    }),
    [me, sessionId],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
