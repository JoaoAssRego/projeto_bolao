import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DISMISSED_KEY = 'push-notif-dismissed'
const SUBSCRIBED_KEY = 'push-notif-subscribed'

function isStandalone(): boolean {
  return (
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

function isSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Evita travar o botão para sempre: `serviceWorker.ready` pode nunca resolver
// se o navegador ainda estiver com um service worker antigo preso em "waiting"
// (ex.: logo após trocar a estratégia do SW, antes do usuário reabrir o app).
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

// https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe — a
// applicationServerKey precisa ser um Uint8Array, não a string base64url da VAPID key.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export function usePushNotifications(participantId: string | null) {
  const [showCard, setShowCard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!participantId) return
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (localStorage.getItem(SUBSCRIBED_KEY)) return
    if (!isStandalone() || !isSupported()) return
    // Permissão "granted" não significa que a inscrição foi salva com sucesso
    // (pode ter falhado depois, ex.: erro do serviço de push) — só "denied"
    // bloqueia de verdade tentar de novo.
    if (Notification.permission === 'denied') return
    setShowCard(true)
  }, [participantId])

  async function subscribe() {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!participantId || !vapidKey) {
      dismiss()
      return
    }

    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        dismiss()
        return
      }

      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        'O app está com uma versão antiga em cache. Feche o app totalmente (não só minimize) e abra de novo, depois tente ativar outra vez.',
      )
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const json = subscription.toJSON()

      const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
        {
          participant_id: participantId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth_key: json.keys?.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      )
      if (upsertError) throw new Error(upsertError.message)

      localStorage.setItem(SUBSCRIBED_KEY, '1')
      dismiss()
    } catch (e) {
      // Não descarta (sem localStorage) para permitir tentar de novo — o problema
      // costuma ser transitório (rede, service worker ainda atualizando).
      console.error('Falha ao ativar notificações push:', e)
      setError(e instanceof Error ? e.message : 'Não foi possível ativar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShowCard(false)
  }

  return { showCard, busy, error, subscribe, dismiss }
}
