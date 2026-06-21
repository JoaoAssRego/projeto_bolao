// ============================================================================
// Edge Function: sync-resultados
// Puxa os jogos da Copa do Mundo no football-data.org e grava os placares
// dos jogos ENCERRADOS na tabela `matches`. Pensada para rodar via pg_cron
// (ver supabase/sync_cron.sql), mas pode ser chamada manualmente.
//
// Deploy:   supabase functions deploy sync-resultados
// Segredos: supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
//           (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm do ambiente)
//
// Regras respeitadas:
//  - Placar = score.fullTime (tempo normal + prorrogação; pênaltis NÃO entram
//    no placar, conforme a regra do mata-mata do bolão).
//  - "Quem avançou" = score.winner (considera pênaltis).
//  - NÃO sobrescreve resultado lançado/corrigido à mão (result_source='manual'
//    com finished=true). A API só preenche o que ainda não foi fechado por humano.
//  - Só toca jogos cujos times já estão definidos (casa por nome).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { canonicalTeam } from './teams.ts'

const COMPETITION = 'WC' // Copa do Mundo no football-data.org
const API_URL = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`

interface ApiTeam {
  name: string | null
  shortName: string | null
  tla: string | null
}
interface ApiMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: { home: number | null; away: number | null }
  }
}

interface DbMatch {
  id: string
  stage: string
  home_team: string | null
  away_team: string | null
  kickoff: string
  external_id: number | null
  result_source: string
  finished: boolean
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

  // 1) Busca os jogos da Copa na API.
  let api: { matches: ApiMatch[] }
  try {
    const res = await fetch(API_URL, { headers: { 'X-Auth-Token': token } })
    if (!res.ok) return json({ error: `football-data.org respondeu ${res.status}`, detail: await res.text() }, 502)
    api = await res.json()
  } catch (e) {
    return json({ error: 'Falha ao chamar a API.', detail: String(e) }, 502)
  }

  const finishedApi = (api.matches ?? []).filter(
    (m) => m.status === 'FINISHED' && m.score.fullTime.home != null && m.score.fullTime.away != null,
  )

  // 2) Carrega os jogos do nosso banco.
  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, stage, home_team, away_team, kickoff, external_id, result_source, finished')
  if (dbErr) return json({ error: 'Falha ao ler matches.', detail: dbErr.message }, 500)

  const db = (dbMatches ?? []) as DbMatch[]
  const updated: string[] = []
  const skippedManual: string[] = []
  const unmatched: string[] = []

  for (const m of finishedApi) {
    const apiHome = canonicalTeam(m.homeTeam.name ?? m.homeTeam.shortName)
    const apiAway = canonicalTeam(m.awayTeam.name ?? m.awayTeam.shortName)
    if (!apiHome || !apiAway) continue

    // Acha o jogo correspondente no banco:
    //  1º por external_id (já vinculado antes);
    //  senão pelo par de times (em qualquer ordem), escolhendo o de kickoff
    //  mais próximo da data da API.
    const byExternal = db.find((d) => d.external_id === m.id)
    let target: DbMatch | undefined = byExternal
    let swapped = false

    if (!target) {
      const apiTime = new Date(m.utcDate).getTime()
      const candidates = db
        .filter((d) => {
          const h = canonicalTeam(d.home_team)
          const a = canonicalTeam(d.away_team)
          if (!h || !a) return false
          return (h === apiHome && a === apiAway) || (h === apiAway && a === apiHome)
        })
        .sort(
          (x, y) =>
            Math.abs(new Date(x.kickoff).getTime() - apiTime) -
            Math.abs(new Date(y.kickoff).getTime() - apiTime),
        )
      target = candidates[0]
      if (target) swapped = canonicalTeam(target.home_team) === apiAway && apiHome !== apiAway
    }

    if (!target) {
      unmatched.push(`${m.homeTeam.name} x ${m.awayTeam.name}`)
      continue
    }

    // Respeita o lançamento manual: não sobrescreve correção humana já fechada.
    if (target.finished && target.result_source === 'manual') {
      skippedManual.push(target.id)
      continue
    }

    // Placar do tempo normal/prorrogação (sem pênaltis).
    let home = m.score.fullTime.home as number
    let away = m.score.fullTime.away as number

    // advancer pelo vencedor geral (inclui pênaltis).
    let advancer: 'home' | 'away' | null = null
    if (m.score.winner === 'HOME_TEAM') advancer = 'home'
    else if (m.score.winner === 'AWAY_TEAM') advancer = 'away'

    // Se o nosso jogo está com os times invertidos em relação à API, inverte tudo.
    if (swapped) {
      ;[home, away] = [away, home]
      if (advancer === 'home') advancer = 'away'
      else if (advancer === 'away') advancer = 'home'
    }

    // advancer só faz sentido no mata-mata.
    if (target.stage === 'group') advancer = null

    const { error: upErr } = await supabase
      .from('matches')
      .update({
        home_score: home,
        away_score: away,
        advancer,
        finished: true,
        external_id: m.id,
        result_source: 'api',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', target.id)

    if (upErr) return json({ error: 'Falha ao atualizar match.', detail: upErr.message, matchId: target.id }, 500)
    updated.push(target.id)
  }

  return json({
    ok: true,
    finishedNaApi: finishedApi.length,
    atualizados: updated.length,
    preservadosManuais: skippedManual.length,
    naoEncontrados: unmatched, // jogos encerrados na API sem confronto correspondente no banco
  })
})
