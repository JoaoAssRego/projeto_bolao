import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import Entrada from './Entrada'

const INVITE_TOKEN_KEY = 'bolao.invite_token'

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Link inválido ou inexistente.',
  revoked: 'Este link foi cancelado pelo criador da liga.',
  expired: 'Este link de convite expirou.',
  full: 'A liga atingiu o limite de membros.',
  not_authenticated: 'Você precisa entrar para aceitar o convite.',
}

export default function ConviteRoute() {
  const { token } = useParams<{ token: string }>()
  const { me } = useAuth()
  const { acceptInviteByToken } = useStore()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    if (!me) {
      sessionStorage.setItem(INVITE_TOKEN_KEY, token)
      return
    }

    void acceptInviteByToken(token)
      .then((result) => {
        sessionStorage.removeItem(INVITE_TOKEN_KEY)
        if (result === 'ok' || result === 'already_member') {
          navigate('/ligas', { replace: true })
        } else {
          setErrorMsg(ERROR_MESSAGES[result] ?? 'Erro ao processar o convite.')
        }
      })
      .catch(() => {
        setErrorMsg('Erro ao processar o convite. Tente novamente.')
      })
  }, [me, token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (errorMsg) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-400">{errorMsg}</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="text-sm text-[var(--accent)]"
        >
          Ir para o início
        </button>
      </div>
    )
  }

  if (!me) {
    return (
      <Entrada inviteBanner="Você foi convidado para uma liga! Entre ou cadastre-se para aceitar automaticamente." />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--t3)]">
      <div className="animate-pulse">Processando convite…</div>
    </div>
  )
}
