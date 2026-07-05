// ============================================================================
// Módulo compartilhado: envio de Web Push com limpeza de inscrições expiradas.
// Usado por send-lembrete-push e send-resultado-push. Pastas prefixadas com
// `_` não são publicadas como Edge Function própria pelo Supabase — só servem
// de import pras demais.
// ============================================================================

import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface PushSubscriptionRow {
  id: string
  participant_id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

export interface PushPayload {
  title: string
  body: string
  url: string
}

export interface SendStats {
  enviados: number
  inscricoesExpiradas: number
  ignorados: number
}

export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

/**
 * Envia uma notificação para cada inscrição em `targets`, removendo do banco
 * as que retornarem 404/410 (endpoint expirado no navegador). `payloadFor`
 * recebe a própria inscrição porque o conteúdo pode variar por participante
 * (ex.: pontos ganhos no jogo).
 *
 * Não faz dedup — quem chama decide, antes de montar `targets`, quem já foi
 * notificado. `processedParticipantIds` (retorno) inclui tanto quem recebeu
 * com sucesso quanto quem tinha inscrição expirada, pois em ambos os casos
 * não faz sentido tentar de novo no próximo cron. Falhas transitórias (rede,
 * 429 etc.) ficam de fora, pra serem retentadas na próxima execução.
 */
export async function sendToSubscriptions(
  supabase: SupabaseClient,
  targets: PushSubscriptionRow[],
  payloadFor: (sub: PushSubscriptionRow) => PushPayload,
): Promise<{ stats: SendStats; processedParticipantIds: string[] }> {
  const stats: SendStats = { enviados: 0, inscricoesExpiradas: 0, ignorados: 0 }
  const processedParticipantIds: string[] = []

  for (const sub of targets) {
    const payload = JSON.stringify(payloadFor(sub))
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
      )
      stats.enviados++
      processedParticipantIds.push(sub.participant_id)
    } catch (e) {
      const statusCode = (e as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        stats.inscricoesExpiradas++
        processedParticipantIds.push(sub.participant_id)
      } else {
        stats.ignorados++
      }
    }
  }

  return { stats, processedParticipantIds }
}
