// ============================================================================
// Edge Function: send-broadcast-push
// Envia um push único para todos os participantes com inscrição ativa,
// independente de partida. Uso: anúncios do app (ex.: novos torneios).
//
// Diferente de send-lembrete-push/send-resultado-push, não roda em cron —
// é disparada manualmente uma vez por broadcast. `broadcast_id` identifica o
// anúncio e é a chave de dedup em push_broadcasts_sent, então rechamar com o
// mesmo id não duplica envios (útil se a chamada falhar no meio e precisar
// ser repetida).
//
// Deploy: supabase functions deploy send-broadcast-push --no-verify-jwt
// Chamada manual (admin logado no app):
//   POST /functions/v1/send-broadcast-push
//   { "broadcast_id": "2026-07-torneios", "title": "...", "body": "...", "url": "/" }
//
// Autorização: apenas admin logado no app (JWT do usuário + current_is_admin()).
// Sem header de cron secret — não há cron chamando esta function.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { setVapidDetails, sendToSubscriptions, type PushSubscriptionRow } from '../_shared/webpush.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function isAdmin(req: Request, supabaseUrl: string): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!authHeader || !anonKey) return false

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await userClient.rpc('current_is_admin')
  return !error && data === true
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return json({ error: 'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT não configurados.' }, 500)
  }
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  if (!(await isAdmin(req, supabaseUrl))) return json({ error: 'Não autorizado.' }, 401)

  let payload: { broadcast_id?: string; title?: string; body?: string; url?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Body inválido, esperado JSON.' }, 400)
  }

  const { broadcast_id: broadcastId, title, body, url } = payload
  if (!broadcastId || !title || !body || !url) {
    return json({ error: 'Campos obrigatórios: broadcast_id, title, body, url.' }, 400)
  }

  setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const [{ data: subscriptions, error: subsErr }, { data: alreadySent, error: sentErr }] = await Promise.all([
      supabase.from('push_subscriptions').select('id, participant_id, endpoint, p256dh, auth_key'),
      supabase.from('push_broadcasts_sent').select('participant_id').eq('broadcast_id', broadcastId),
    ])
    if (subsErr) throw new Error(subsErr.message)
    if (sentErr) throw new Error(sentErr.message)

    const excluded = new Set((alreadySent ?? []).map((s) => s.participant_id as string))
    const targets = ((subscriptions ?? []) as PushSubscriptionRow[]).filter((s) => !excluded.has(s.participant_id))

    if (targets.length === 0) {
      return json({ ok: true, enviados: 0, inscricoesExpiradas: 0, ignorados: 0, skipped: true })
    }

    const { stats, processedParticipantIds } = await sendToSubscriptions(supabase, targets, () => ({ title, body, url }))

    for (const participantId of processedParticipantIds) {
      await supabase.from('push_broadcasts_sent').upsert(
        { broadcast_id: broadcastId, participant_id: participantId },
        { onConflict: 'broadcast_id,participant_id' },
      )
    }

    await supabase.from('sync_logs').insert({ function_name: 'send-broadcast-push', status: 'ok', summary: { broadcastId, ...stats } })
    return json({ ok: true, ...stats })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro inesperado.'
    await supabase.from('sync_logs').insert({ function_name: 'send-broadcast-push', status: 'error', summary: { broadcastId, error: message } })
    return json({ error: message }, 500)
  }
})
