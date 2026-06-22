import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Participant } from '../lib/types'

const PARTICIPANT_COLS = 'id,name,is_admin,created_at,has_password,has_auth'

interface AuthValue {
  me: Participant | null
  sessionId: string | null // mantido para compatibilidade com App.tsx
  loading: boolean
  signIn: (p: Participant) => void // atualização explícita (migração lazy)
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

async function fetchMe(authUserId: string): Promise<Participant | null> {
  const { data } = await supabase
    .from('participants')
    .select(PARTICIPANT_COLS)
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  return (data as Participant) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const participant = await fetchMe(session.user.id)
        setMe(participant)
      } else {
        setMe(null)
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
      signIn: (p) => setMe(p),
      signOut: async () => {
        await supabase.auth.signOut()
        setMe(null)
      },
    }),
    [me, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
