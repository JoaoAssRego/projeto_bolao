import { useState } from 'react'
import { useStore } from '../data/store'
import { useAuth } from '../data/auth'

export default function Entrada() {
  const { participants, createParticipant } = useStore()
  const { signIn } = useAuth()
  const [mode, setMode] = useState<'menu' | 'novo' | 'existente'>('menu')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setErr(null)
    try {
      const created = await createParticipant(trimmed)
      signIn(created)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      setErr(msg.includes('duplicate') ? 'Esse nome já existe. Use "Já participo".' : 'Não consegui cadastrar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <img src="/icon.svg" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Bolão da Copa</h1>
        <p className="mt-1 text-sm text-emerald-200/70">Palpite nos jogos e dispute com a galera.</p>
      </div>

      {mode === 'menu' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode('novo')}
            className="rounded-2xl bg-canarinho-yellow py-4 text-lg font-bold text-emerald-950 active:opacity-90"
          >
            Sou novo aqui
          </button>
          <button
            onClick={() => setMode('existente')}
            className="rounded-2xl border border-emerald-700 py-4 text-lg font-semibold text-emerald-100 active:bg-emerald-900/40"
          >
            Já participo
          </button>
        </div>
      )}

      {mode === 'novo' && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-emerald-200/80">Como você quer aparecer no ranking?</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Seu nome ou apelido"
            maxLength={24}
            className="rounded-xl bg-emerald-950 px-4 py-3 text-lg outline-none ring-emerald-600 focus:ring-2"
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            className="rounded-2xl bg-canarinho-yellow py-3 font-bold text-emerald-950 disabled:opacity-40"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <button onClick={() => setMode('menu')} className="text-sm text-emerald-300/60">
            ← voltar
          </button>
        </div>
      )}

      {mode === 'existente' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-200/80">Toque no seu nome:</p>
          {participants.length === 0 ? (
            <p className="text-sm text-emerald-300/50">Ninguém se cadastrou ainda. Use "Sou novo aqui".</p>
          ) : (
            <div className="flex flex-col gap-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => signIn(p)}
                  className="rounded-xl border border-emerald-800 px-4 py-3 text-left font-medium text-emerald-50 active:bg-emerald-900/50"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setMode('menu')} className="text-sm text-emerald-300/60">
            ← voltar
          </button>
        </div>
      )}
    </div>
  )
}
