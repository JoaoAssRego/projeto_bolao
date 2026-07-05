import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { isIOS, isStandalone } from './platform'

const DISMISSED_KEY = 'push-notif-dismissed'
const SUBSCRIBED_KEY = 'push-notif-subscribed'

function isSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function platformLabel(): string {
  if (isIOS()) return 'ios'
  if (/android/i.test(navigator.userAgent)) return 'android'
  return 'other'
}

// Best-effort: nunca deve derrubar o fluxo de ativação por causa de um erro
// ao gravar telemetria (rede, RLS, etc.) — só registramos e seguimos.
function logAttempt(
  participantId: string,
  fields: { permissionBefore: string; permissionAfter?: string; error?: unknown },
) {
  const error = fields.error instanceof Error ? fields.error : null
  supabase
    .from('push_debug_log')
    .insert({
      participant_id: participantId,
      platform: platformLabel(),
      standalone: isStandalone(),
      permission_before: fields.permissionBefore,
      permission_after: fields.permissionAfter ?? null,
      error_name: error?.name ?? null,
      error_message: error ? error.message : typeof fields.error === 'string' ? fields.error : null,
      user_agent: navigator.userAgent,
    })
    .then(({ error: insertError }) => {
      if (insertError) console.error('Falha ao gravar push_debug_log:', insertError)
    })
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

const BLOCKED_MESSAGE_IOS =
  'Notificações bloqueadas. Vá em Ajustes do iPhone → Notificações → Bolão e ative "Permitir Notificações". Se o app não aparecer na lista, remova-o da Tela de Início e adicione de novo (Compartilhar → Adicionar à Tela de Início).'

const BLOCKED_MESSAGE_ANDROID =
  'Notificações bloqueadas. Verifique: 1) Configurações do Android → Apps → Chrome (ou seu navegador) → Notificações → ativado; 2) toque no cadeado ao lado do endereço do site → Permissões → Notificações → Permitir.'

const BLOCKED_MESSAGE_OTHER =
  'Notificações bloqueadas nas configurações do navegador. Verifique as permissões de notificação para este site.'

export function usePushNotifications(participantId: string | null) {
  const [showCard, setShowCard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!participantId) return
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (localStorage.getItem(SUBSCRIBED_KEY)) return
    if (!isSupported()) return
    // No iOS, a Push API só existe dentro do app instalado na Tela de Início
    // (display-mode: standalone) — oferecer o botão numa aba comum do Safari
    // garante falha. O PWAInstallCard já cobre a instalação; deixamos o card
    // de notificação para depois disso.
    if (isIOS() && !isStandalone()) return
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
    const permissionBefore = Notification.permission
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        logAttempt(participantId, { permissionBefore, permissionAfter: permission })
        // Se o navegador nem chegou a mostrar o popup de permissão, é porque
        // já foi negada antes, ou o SO bloqueou o app/navegador inteiro de
        // enviar notificações — sem dismiss(), pra explicar o que fazer em
        // vez de o card só sumir sem avisar nada.
        setError(
          isIOS() ? BLOCKED_MESSAGE_IOS : /android/i.test(navigator.userAgent) ? BLOCKED_MESSAGE_ANDROID : BLOCKED_MESSAGE_OTHER,
        )
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

      logAttempt(participantId, { permissionBefore, permissionAfter: permission })
      localStorage.setItem(SUBSCRIBED_KEY, '1')
      dismiss()
    } catch (e) {
      // Não descarta (sem localStorage) para permitir tentar de novo — o problema
      // costuma ser transitório (rede, service worker ainda atualizando).
      console.error('Falha ao ativar notificações push:', e)
      logAttempt(participantId, { permissionBefore, error: e })
      // No Chrome/Android, a inscrição depende do Google Play Services (é
      // quem registra o navegador no FCM); aparelhos sem ele (ROMs
      // "degoogled", alguns Huawei) rejeitam com esse erro específico.
      const isPushServiceError =
        e instanceof Error && e.name === 'AbortError' && /push service/i.test(e.message)
      setError(
        isPushServiceError
          ? 'Este aparelho não tem o Google Play Services disponível — notificações push não funcionam sem ele neste navegador.'
          : e instanceof Error
            ? e.message
            : 'Não foi possível ativar. Tente de novo.',
      )
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
