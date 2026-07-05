// ============================================================================
// Edge Function: send-resultado-push
// Quando um jogo termina (finished = true), envia Web Push pra dois grupos:
//   - quem palpitou aquele jogo: placar final + pontos ganhos (type='result')
//   - quem não palpitou: convite genérico pra conferir a classificação
//     (type='no_prediction')
// Projetada para rodar a cada 5 minutos via pg_cron (ver
// supabase/migrations/0014_push_resultados.sql).
//
// Janela: só considera jogos cujo kickoff foi nas últimas 6h, pra não mandar
// notificação "atrasada" de um jogo antigo caso o cron fique fora do ar.
//
// Dedup: cada trinca (match_id, participant_id, type) só recebe um envio,
// mesmo com o cron reavaliando o mesmo jogo várias vezes até sair da janela
// (tabela push_results_sent).
//
// Deploy: supabase functions deploy send-resultado-push --no-verify-jwt
// Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
//
// Autorização: aceita a chamada do pg_cron (header x-cron-secret == CRON_SECRET)
// ou de um admin logado no app (JWT do usuário + current_is_admin() via RPC).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { setVapidDetails, sendToSubscriptions, type PushSubscriptionRow } from '../_shared/webpush.ts'
import { scoreFor } from '../_shared/scoring.ts'

const RESULT_WINDOW_HOURS = 6

interface DbMatch {
  id: string
  home_team: string | null
  away_team: string | null
  home_score: number
  away_score: number
  stage: string
  advancer: 'home' | 'away' | null
  kickoff: string
}

interface DbPrediction {
  participant_id: string
  home_score: number
  away_score: number
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

function matchLabel(match: DbMatch): string {
  return match.home_team && match.away_team
    ? `${match.home_team} ${match.home_score}x${match.away_score} ${match.away_team}`
    : 'Seu jogo'
}

function resultBody(points: number): string {
  if (points === 10) return 'Cravou o placar exato! 🎯'
  if (points === 7) return 'Acertou o saldo do jogo!'
  if (points === 5) return 'Acertou o resultado!'
  return 'Não dessa vez. Confira o próximo jogo!'
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

  const result = {
    jogosFinalizados: 0,
    resultadosEnviados: 0,
    convitesLigaEnviados: 0,
    inscricoesExpiradas: 0,
    ignorados: 0,
  }

  try {
    const windowStart = new Date(Date.now() - RESULT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

    const { data: finished, error: matchesErr } = await supabase
      .from('matches')
      .select('id, home_team, away_team, home_score, away_score, stage, advancer, kickoff')
      .eq('finished', true)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)
      .gte('kickoff', windowStart)

    if (matchesErr) throw new SyncError('Falha ao ler matches.', 500, matchesErr.message)

    const matches = (finished ?? []) as DbMatch[]
    result.jogosFinalizados = matches.length

    if (matches.length === 0) {
      await supabase
        .from('sync_logs')
        .insert({ function_name: 'send-resultado-push', status: 'skipped', summary: { reason: 'Nenhum jogo finalizado na janela.' } })
      return json({ ok: true, skipped: true, ...result })
    }

    const { data: subscriptions, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('id, participant_id, endpoint, p256dh, auth_key')
    if (subsErr) throw new SyncError('Falha ao ler push_subscriptions.', 500, subsErr.message)

    const allSubs = (subscriptions ?? []) as PushSubscriptionRow[]
    if (allSubs.length === 0) {
      await supabase
        .from('sync_logs')
        .insert({ function_name: 'send-resultado-push', status: 'skipped', summary: { reason: 'Nenhuma inscrição push ativa.' } })
      return json({ ok: true, skipped: true, ...result })
    }

    for (const match of matches) {
      const [{ data: predictions, error: predErr }, { data: alreadySent, error: sentErr }] = await Promise.all([
        supabase.from('predictions').select('participant_id, home_score, away_score').eq('match_id', match.id),
        supabase.from('push_results_sent').select('participant_id, type').eq('match_id', match.id),
      ])
      if (predErr) throw new SyncError('Falha ao ler predictions.', 500, predErr.message)
      if (sentErr) throw new SyncError('Falha ao ler push_results_sent.', 500, sentErr.message)

      const predByParticipant = new Map<string, DbPrediction>(
        ((predictions ?? []) as DbPrediction[]).map((p) => [p.participant_id, p]),
      )
      const sentResult = new Set<string>()
      const sentNoPrediction = new Set<string>()
      for (const s of (alreadySent ?? []) as { participant_id: string; type: string }[]) {
        if (s.type === 'result') sentResult.add(s.participant_id)
        else if (s.type === 'no_prediction') sentNoPrediction.add(s.participant_id)
      }

      const label = matchLabel(match)

      const resultTargets = allSubs.filter(
        (s) => predByParticipant.has(s.participant_id) && !sentResult.has(s.participant_id),
      )
      const noPredictionTargets = allSubs.filter(
        (s) => !predByParticipant.has(s.participant_id) && !sentNoPrediction.has(s.participant_id),
      )

      if (resultTargets.length > 0) {
        const { stats, processedParticipantIds } = await sendToSubscriptions(supabase, resultTargets, (sub) => {
          const pred = predByParticipant.get(sub.participant_id)
          const points = scoreFor(pred, match)
          return {
            title: `⚽ ${label} — ${points} pts`,
            body: resultBody(points),
            url: '/jogos',
          }
        })
        result.resultadosEnviados += stats.enviados
        result.inscricoesExpiradas += stats.inscricoesExpiradas
        result.ignorados += stats.ignorados

        for (const participantId of processedParticipantIds) {
          await supabase
            .from('push_results_sent')
            .upsert({ match_id: match.id, participant_id: participantId, type: 'result' }, { onConflict: 'match_id,participant_id,type' })
        }
      }

      if (noPredictionTargets.length > 0) {
        const payload = {
          title: `👀 ${label} terminou`,
          body: 'Você não palpitou esse jogo. Confira a classificação e não fique para trás!',
          url: '/',
        }
        const { stats, processedParticipantIds } = await sendToSubscriptions(supabase, noPredictionTargets, () => payload)
        result.convitesLigaEnviados += stats.enviados
        result.inscricoesExpiradas += stats.inscricoesExpiradas
        result.ignorados += stats.ignorados

        for (const participantId of processedParticipantIds) {
          await supabase
            .from('push_results_sent')
            .upsert(
              { match_id: match.id, participant_id: participantId, type: 'no_prediction' },
              { onConflict: 'match_id,participant_id,type' },
            )
        }
      }
    }

    await supabase.from('sync_logs').insert({ function_name: 'send-resultado-push', status: 'ok', summary: result })
    return json({ ok: true, ...result })
  } catch (e) {
    const status = e instanceof SyncError ? e.status : 500
    const detail = e instanceof SyncError ? e.detail : String(e)
    const message = e instanceof Error ? e.message : 'Erro inesperado.'
    await supabase
      .from('sync_logs')
      .insert({ function_name: 'send-resultado-push', status: 'error', summary: { ...result, error: message, detail } })
    return json({ error: message, detail }, status)
  }
})
