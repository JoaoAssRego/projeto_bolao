import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  // Não quebra o app: mostramos um aviso amigável na tela de entrada.
  console.warn(
    'Supabase não configurado. Copie .env.example para .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  )
}

// Cliente único usado em todo o app (anon key — segurança "na confiança").
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key')
