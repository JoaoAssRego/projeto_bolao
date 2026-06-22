// ============================================================================
// Edge Function: sync-ao-vivo
// Atualiza placares dos jogos que já começaram mas ainda não foram finalizados.
// Projetada para rodar a cada minuto via pg_cron (ver supabase/sync_ao_vivo_cron.sql).
//
// Otimização: se não houver nenhum jogo "ao vivo" (travado + não finalizado),
// retorna imediatamente SEM chamar a API externa — evita cotas desnecessárias.
//
// Deploy: supabase functions deploy sync-ao-vivo
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ApiTeam {
  name: string | null
  shortName: string | null
}
interface ApiMatch {
  id: number
  status: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
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

Deno.serve(async () => {
  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) return json({ error: 'FOOTBALL_DATA_TOKEN não configurado.' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey)

  // Só busca jogos que começaram há pelo menos 90 min (tempo mínimo para um jogo terminar).
  const nowMs = Date.now()
  const ninetyMinAgo = new Date(nowMs - 90 * 60 * 1000).toISOString()
  const { data: liveMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, stage, kickoff, external_id, result_source, finished, home_team, away_team')
    .lte('kickoff', ninetyMinAgo)
    .eq('finished', false)

  if (dbErr) return json({ error: 'Falha ao ler matches.', detail: dbErr.message }, 500)

  const live = (liveMatches ?? []) as DbMatch[]

  // Só processa jogos com 95+ min de kickoff (tempo suficiente para qualquer partida terminar)
  // e que tenham external_id para buscar na API.
  const candidates = live.filter((m) => {
    if (m.external_id == null || m.result_source === 'manual') return false
    return nowMs >= new Date(m.kickoff).getTime() + 95 * 60 * 1000
  })
  if (candidates.length === 0) {
    return json({ ok: true, skipped: true, reason: 'Jogos ao vivo sem external_id ou todos manuais.' })
  }

  const byExternal = new Map<number, DbMatch>()
  for (const m of candidates) if (m.external_id != null) byExternal.set(m.external_id, m)

  // Chama a API somente quando há jogos a atualizar.
  let api: { matches: ApiMatch[] }
  try {
    const res = await fetch(API_URL, { headers: { 'X-Auth-Token': token } })
    if (!res.ok) return json({ error: `football-data.org respondeu ${res.status}`, detail: await res.text() }, 502)
    api = await res.json()
  } catch (e) {
    return json({ error: 'Falha ao chamar a API.', detail: String(e) }, 502)
  }

  const result = { placaresFinalizados: 0, placaresEmAndamento: 0, ignorados: 0 }

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
      // Jogo em andamento: atualiza o placar parcial SEM marcar como finalizado.
      patch.home_score = m.score.fullTime.home
      patch.away_score = m.score.fullTime.away
      result.placaresEmAndamento++
    } else {
      result.ignorados++
      continue
    }

    const { error: upErr } = await supabase.from('matches').update(patch).eq('id', target.id)
    if (upErr) return json({ error: 'Falha ao atualizar jogo.', detail: upErr.message, matchId: target.id }, 500)
  }

  return json({ ok: true, jogosCandidatos: candidates.length, ...result })
})
