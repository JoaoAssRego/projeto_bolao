import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Participant } from '../lib/types'

interface AuthValue {
  me: Participant | null
  sessionId: string | null
  loading: boolean
  recoveryMode: boolean
  signIn: (p: Participant) => void
  signOut: () => Promise<void>
  clearRecovery: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

async function fetchMe(authUserId: string): Promise<Participant | null> {
  // Tenta com email (pós-migration 0006); cai para sem-email se coluna não existir.
  let result = await supabase
    .from('participants')
    .select('id,name,is_admin,created_at,has_password,has_auth,email')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (result.error?.code === 'PGRST204') {
    result = await supabase
      .from('participants')
      .select('id,name,is_admin,created_at,has_password,has_auth')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
  }
  return (result.data as Participant) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        if (session?.user) {
          const participant = await fetchMe(session.user.id)
          setMe(participant)
        }
      } else if (session?.user) {
        const participant = await fetchMe(session.user.id)
        setMe(participant)
        setRecoveryMode(false)
      } else {
        setMe(null)
        setRecoveryMode(false)
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      me,
      sessionId: me?.id ?? null,
      loading,
      recoveryMode,
      signIn: (p) => setMe(p),
      signOut: async () => {
        await supabase.auth.signOut()
        setMe(null)
        setRecoveryMode(false)
      },
      clearRecovery: () => setRecoveryMode(false),
    }),
    [me, loading, recoveryMode],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
