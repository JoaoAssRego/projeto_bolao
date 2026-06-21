// Identidade "lembrada" neste aparelho (sem login). Guardamos só id + nome.
const KEY = 'bolao.participant'

export interface SessionUser {
  id: string
  name: string
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function setSession(user: SessionUser): void {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
