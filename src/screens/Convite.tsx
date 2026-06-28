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
  not_authenticated: 'Você precisa entrar para solicitar entrada na liga.',
  already_requested: 'Você já enviou um pedido para esta liga. Aguarde a aprovação do criador.',
}

export default function ConviteRoute() {
  const { token } = useParams<{ token: string }>()
  const { me } = useAuth()
  const { acceptInviteByToken } = useStore()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'processing' | 'requested' | 'accepted' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    if (!me) {
      sessionStorage.setItem(INVITE_TOKEN_KEY, token)
      return
    }

    setStatus('processing')
    void acceptInviteByToken(token)
      .then((result) => {
        sessionStorage.removeItem(INVITE_TOKEN_KEY)
        if (result === 'ok') {
          setStatus('requested')
        } else if (result === 'ok_accepted' || result === 'already_member') {
          setStatus('accepted')
        } else if (result === 'already_requested') {
          setStatus('requested')
        } else {
          setErrorMsg(ERROR_MESSAGES[result] ?? 'Erro ao processar o convite.')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('Erro ao processar o convite. Tente novamente.')
        setStatus('error')
      })
  }, [me, token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-400">{errorMsg}</p>
        <button onClick={() => navigate('/', { replace: true })} className="text-sm text-[var(--accent)]">
          Ir para o início
        </button>
      </div>
    )
  }

  if (status === 'requested') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">✋</div>
        <h2 className="text-lg font-bold text-[var(--t1)]">Pedido enviado!</h2>
        <p className="text-sm text-[var(--t2)]">
          Seu pedido foi enviado ao criador da liga. Você será adicionado assim que ele aprovar.
        </p>
        <button onClick={() => navigate('/', { replace: true })} className="text-sm text-[var(--accent)]">
          Ir para o início
        </button>
      </div>
    )
  }

  if (status === 'accepted') {
    navigate('/ligas', { replace: true })
    return null
  }

  if (!me) {
    return (
      <Entrada inviteBanner="Você foi convidado para uma liga! Entre ou cadastre-se para enviar seu pedido de entrada." />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--t3)]">
      <div className="animate-pulse">Processando convite…</div>
    </div>
  )
}
