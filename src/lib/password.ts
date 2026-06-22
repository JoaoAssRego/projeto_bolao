// Hash de senha no cliente (SHA-256 via Web Crypto). Segurança "na confiança":
// o sal é fixo e público — suficiente para um bolão de amigos, não para dados
// sensíveis. Nunca guardamos a senha em texto puro.
const SALT = 'bolao-copa-2026'

export async function hashPassword(plain: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
