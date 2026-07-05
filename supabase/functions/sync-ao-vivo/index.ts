// ============================================================================
// Edge Function: sync-ao-vivo
// Atualiza placares dos jogos que já começaram mas ainda não foram finalizados.
// Projetada para rodar a cada minuto via pg_cron (ver supabase/migrations/0009_sync_observability_cron.sql).
//
// Otimização: se não houver nenhum jogo "ao vivo" (travado + não finalizado),
// retorna imediatamente SEM chamar a API externa — evita cotas desnecessárias.
//
// Deploy: supabase functions deploy sync-ao-vivo --no-verify-jwt
// Segredos: supabase secrets set CRON_SECRET=<valor gerado em vault.decrypted_secrets>
//
// Autorização: aceita a chamada do pg_cron (header x-cron-secret == CRON_SECRET)
// ou de um admin logado no app (JWT do usuário + current_is_admin() via RPC).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ApiTeam {
  name: string | null
  shortName: string | null
}
interface ApiMatch {
  id: number
  status: string
  stage: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
}

interface DbMatch {
  id: string
  stage: string
  kickoff: string
  external_id: number | null
  result_source: string
  finished: boolean
  home_team: string | null
  away_team: string | null
}

const COMPETITION = 'WC'
const API_URL = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group', LAST_32: 'r32', ROUND_OF_32: 'r32',
  LAST_16: 'r16', ROUND_OF_16: 'r16', QUARTER_FINALS: 'qf', QUARTER_FINAL: 'qf',
  SEMI_FINALS: 'sf', SEMI_FINAL: 'sf', THIRD_PLACE: 'third', '3RD_PLACE': 'third', FINAL: 'final',
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
  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) return json({ error: 'FOOTBALL_DATA_TOKEN não configurado.' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  if (!(await isAuthorized(req, supabaseUrl))) return json({ error: 'Não autorizado.' }, 401)

  const supabase = createClient(supabaseUrl, serviceKey)

  const result = { placaresFinalizados: 0, placaresEmAndamento: 0, ignorados: 0 }

  try {
    // Só busca jogos que começaram há pelo menos 90 min (tempo mínimo para um jogo terminar).
    const nowMs = Date.now()
    const ninetyMinAgo = new Date(nowMs - 90 * 60 * 1000).toISOString()
    const { data: liveMatches, error: dbErr } = await supabase
      .from('matches')
      .select('id, stage, kickoff, external_id, result_source, finished, home_team, away_team')
      .lte('kickoff', ninetyMinAgo)
      .eq('finished', false)

    if (dbErr) throw new SyncError('Falha ao ler matches.', 500, dbErr.message)

    const live = (liveMatches ?? []) as DbMatch[]

    // Só processa jogos com 95+ min de kickoff (tempo suficiente para qualquer partida terminar)
    // e que tenham external_id para buscar na API. Sem limite superior: um jogo em
    // prorrogação/pênaltis continua sendo checado a cada execução até vir FINISHED.
    const candidates = live.filter((m) => {
      if (m.external_id == null || m.result_source === 'manual') return false
      return nowMs >= new Date(m.kickoff).getTime() + 95 * 60 * 1000
    })
    if (candidates.length === 0) {
      const reason = 'Jogos ao vivo sem external_id ou todos manuais.'
      await supabase.from('sync_logs').insert({ function_name: 'sync-ao-vivo', status: 'skipped', summary: { reason } })
      return json({ ok: true, skipped: true, reason })
    }

    const byExternal = new Map<number, DbMatch>()
    for (const m of candidates) if (m.external_id != null) byExternal.set(m.external_id, m)

    // Chama a API somente quando há jogos a atualizar.
    let api: { matches: ApiMatch[] }
    try {
      const res = await fetch(API_URL, { headers: { 'X-Auth-Token': token } })
      if (!res.ok) throw new SyncError(`football-data.org respondeu ${res.status}`, 502, await res.text())
      api = await res.json()
    } catch (e) {
      throw e instanceof SyncError ? e : new SyncError('Falha ao chamar a API.', 502, String(e))
    }

    for (const m of api.matches ?? []) {
      const stage = STAGE_MAP[m.stage]
      if (!stage) continue

      const target = byExternal.get(m.id)
      if (!target) continue

      const patch: Record<string, unknown> = { last_synced_at: new Date().toISOString() }

      if (m.status === 'FINISHED' && m.score.fullTime.home != null && m.score.fullTime.away != null) {
        // Jogo encerrado: aplica placar final e marca como finalizado.
        let advancer: 'home' | 'away' | null =
          m.score.winner === 'HOME_TEAM' ? 'home' : m.score.winner === 'AWAY_TEAM' ? 'away' : null
        if (stage === 'group') advancer = null

        patch.home_score = m.score.fullTime.home
        patch.away_score = m.score.fullTime.away
        patch.advancer = advancer
        patch.finished = true
        patch.result_source = 'api'
        result.placaresFinalizados++
      } else if (
        (m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME') &&
        m.score.fullTime.home != null &&
        m.score.fullTime.away != null
      ) {
        // Durante a disputa de pênaltis a API pode reportar os gols do shootout em
        // score.fullTime, corrompendo o placar da partida. Ignoramos atualizações
        // parciais nessa fase — o placar correto já foi salvo ao final da prorrogação.
        if (m.score.duration === 'PENALTY_SHOOTOUT') {
          result.ignorados++
          continue
        }
        // Jogo em andamento (inclui prorrogação: a API mantém IN_PLAY/PAUSED,
        // não existe um status separado de "prorrogação" — score.duration que muda).
        patch.home_score = m.score.fullTime.home
        patch.away_score = m.score.fullTime.away
        result.placaresEmAndamento++
      } else {
        result.ignorados++
        continue
      }

      const { error: upErr } = await supabase.from('matches').update(patch).eq('id', target.id)
      if (upErr) throw new SyncError('Falha ao atualizar jogo.', 500, { detail: upErr.message, matchId: target.id })
    }

    await supabase.from('sync_logs').insert({
      function_name: 'sync-ao-vivo',
      status: 'ok',
      summary: { jogosCandidatos: candidates.length, ...result },
    })
    return json({ ok: true, jogosCandidatos: candidates.length, ...result })
  } catch (e) {
    const status = e instanceof SyncError ? e.status : 500
    const detail = e instanceof SyncError ? e.detail : String(e)
    const message = e instanceof Error ? e.message : 'Erro inesperado.'
    await supabase
      .from('sync_logs')
      .insert({ function_name: 'sync-ao-vivo', status: 'error', summary: { ...result, error: message, detail } })
    return json({ error: message, detail }, status)
  }
})
