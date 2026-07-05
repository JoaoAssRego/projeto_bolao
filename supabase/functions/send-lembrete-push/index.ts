// ============================================================================
// Edge Function: send-lembrete-push
// Envia um lembrete Web Push para participantes que ainda não palpitaram em
// jogos cujo kickoff está a poucos minutos de travar.
// Projetada para rodar a cada 5 minutos via pg_cron (ver
// supabase/migrations/0010_push_notifications.sql).
//
// Dedup: cada par (match_id, participant_id) só recebe um lembrete, mesmo com
// o cron reavaliando a mesma janela várias vezes (tabela push_reminders_sent).
//
// Deploy: supabase functions deploy send-lembrete-push --no-verify-jwt
// Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
//
// Autorização: aceita a chamada do pg_cron (header x-cron-secret == CRON_SECRET)
// ou de um admin logado no app (JWT do usuário + current_is_admin() via RPC).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { setVapidDetails, sendToSubscriptions, type PushSubscriptionRow } from '../_shared/webpush.ts'

const REMINDER_WINDOW_MINUTES = 15

interface DbMatch {
  id: string
  home_team: string | null
  away_team: string | null
  kickoff: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

class SyncError extends Error {
  status: number
  detail?: unknown
  constructor(message: string, status = 500, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function isAuthorized(req: Request, supabaseUrl: string): Promise<boolean> {
  const cronSecret = Deno.env.get('CRON_SECRET')
  const headerSecret = req.headers.get('x-cron-secret')
  if (cronSecret && headerSecret && headerSecret === cronSecret) return true

  const authHeader = req.headers.get('Authorization')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!authHeader || !anonKey) return false

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await userClient.rpc('current_is_admin')
  return !error && data === true
}

Deno.serve(async (req) => {
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return json({ error: 'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT não configurados.' }, 500)
  }
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  if (!(await isAuthorized(req, supabaseUrl))) return json({ error: 'Não autorizado.' }, 401)

  setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = createClient(supabaseUrl, serviceKey)

  const result = { jogosNaJanela: 0, lembretesEnviados: 0, inscricoesExpiradas: 0, ignorados: 0 }

  try {
    const nowMs = Date.now()
    const windowEnd = new Date(nowMs + REMINDER_WINDOW_MINUTES * 60 * 1000).toISOString()
    const nowIso = new Date(nowMs).toISOString()

    const { data: upcoming, error: matchesErr } = await supabase
      .from('matches')
      .select('id, home_team, away_team, kickoff')
      .eq('finished', false)
      .gt('kickoff', nowIso)
      .lte('kickoff', windowEnd)

    if (matchesErr) throw new SyncError('Falha ao ler matches.', 500, matchesErr.message)

    const matches = (upcoming ?? []) as DbMatch[]
    result.jogosNaJanela = matches.length

    if (matches.length === 0) {
      await supabase.from('sync_logs').insert({ function_name: 'send-lembrete-push', status: 'skipped', summary: { reason: 'Nenhum jogo na janela.' } })
      return json({ ok: true, skipped: true, ...result })
    }

    for (const match of matches) {
      const [{ data: predictions, error: predErr }, { data: alreadySent, error: sentErr }] = await Promise.all([
        supabase.from('predictions').select('participant_id').eq('match_id', match.id),
        supabase.from('push_reminders_sent').select('participant_id').eq('match_id', match.id),
      ])
      if (predErr) throw new SyncError('Falha ao ler predictions.', 500, predErr.message)
      if (sentErr) throw new SyncError('Falha ao ler push_reminders_sent.', 500, sentErr.message)

      const excluded = new Set<string>([
        ...(predictions ?? []).map((p) => p.participant_id as string),
        ...(alreadySent ?? []).map((s) => s.participant_id as string),
      ])

      const { data: subscriptions, error: subsErr } = await supabase
        .from('push_subscriptions')
        .select('id, participant_id, endpoint, p256dh, auth_key')
      if (subsErr) throw new SyncError('Falha ao ler push_subscriptions.', 500, subsErr.message)

      const targets = ((subscriptions ?? []) as PushSubscriptionRow[]).filter((s) => !excluded.has(s.participant_id))
      if (targets.length === 0) continue

      const label = match.home_team && match.away_team ? `${match.home_team} x ${match.away_team}` : 'Seu jogo'
      const payload = {
        title: `⏰ ${label} fecha em breve`,
        body: 'Você ainda não palpitou. Toque para palpitar agora.',
        url: '/jogos',
      }

      const { stats, processedParticipantIds } = await sendToSubscriptions(supabase, targets, () => payload)
      result.lembretesEnviados += stats.enviados
      result.inscricoesExpiradas += stats.inscricoesExpiradas
      result.ignorados += stats.ignorados

      // Marca como processado (sucesso ou inscrição expirada) para nunca reenviar.
      for (const participantId of processedParticipantIds) {
        await supabase.from('push_reminders_sent').upsert(
          { match_id: match.id, participant_id: participantId },
          { onConflict: 'match_id,participant_id' },
        )
      }
    }

    await supabase.from('sync_logs').insert({ function_name: 'send-lembrete-push', status: 'ok', summary: result })
    return json({ ok: true, ...result })
  } catch (e) {
    const status = e instanceof SyncError ? e.status : 500
    const detail = e instanceof SyncError ? e.detail : String(e)
    const message = e instanceof Error ? e.message : 'Erro inesperado.'
    await supabase
      .from('sync_logs')
      .insert({ function_name: 'send-lembrete-push', status: 'error', summary: { ...result, error: message, detail } })
    return json({ error: message, detail }, status)
  }
})
