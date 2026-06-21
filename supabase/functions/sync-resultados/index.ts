// ============================================================================
// Edge Function: sync-resultados
// Importa os jogos da Copa do Mundo (football-data.org) e mantém a tabela
// `matches` em dia: CRIA os jogos que ainda vão acontecer (grupos + mata-mata),
// atualiza times/horário e preenche o PLACAR dos jogos encerrados.
// Pensada para rodar via pg_cron (ver supabase/sync_cron.sql).
//
// Deploy:   supabase functions deploy sync-resultados
// Segredos: supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
//           (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm do ambiente)
//
// Princípios:
//  - Só CRIA jogo que ainda NÃO começou (status SCHEDULED/TIMED). Jogos já
//    ocorridos antes de entrarmos na Copa ficam de fora (não dá pra apostar
//    no passado) — alinhado à ESPECIFICACAO.md.
//  - Placar = score.fullTime (tempo normal + prorrogação; pênaltis NÃO contam
//    para o placar). "Quem avançou" = score.winner (considera pênaltis).
//  - NUNCA sobrescreve resultado lançado/corrigido à mão (finished + manual).
//  - NUNCA inverte a ordem mandante/visitante de um jogo que já tem times
//    definidos (isso corromperia palpites já feitos) — só ajusta o placar
//    conforme a orientação existente.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { canonicalTeam, displayTeam } from './teams.ts'

const COMPETITION = 'WC'
const API_URL = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`

// football-data.org stage -> nossa fase.
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  LAST_32: 'r32',
  ROUND_OF_32: 'r32',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  QUARTER_FINAL: 'qf',
  SEMI_FINALS: 'sf',
  SEMI_FINAL: 'sf',
  THIRD_PLACE: 'third',
  '3RD_PLACE': 'third',
  FINAL: 'final',
}

interface ApiTeam {
  name: string | null
  shortName: string | null
  tla: string | null
}
interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
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
  ordering: number
  label: string | null
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

// "GROUP_A" / "GROUP_C" -> "Grupo A". Senão, rótulo padrão da fase.
function groupLabel(g: string | null): string | null {
  if (!g) return null
  const m = /GROUP[_\s-]?([A-Z])/i.exec(g)
  return m ? `Grupo ${m[1].toUpperCase()}` : null
}

Deno.serve(async () => {
  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) return json({ error: 'FOOTBALL_DATA_TOKEN não configurado.' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1) Jogos da Copa na API.
  let api: { matches: ApiMatch[] }
  try {
    const res = await fetch(API_URL, { headers: { 'X-Auth-Token': token } })
    if (!res.ok) return json({ error: `football-data.org respondeu ${res.status}`, detail: await res.text() }, 502)
    api = await res.json()
  } catch (e) {
    return json({ error: 'Falha ao chamar a API.', detail: String(e) }, 502)
  }

  // 2) Jogos do nosso banco.
  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, stage, ordering, label, home_team, away_team, kickoff, external_id, result_source, finished')
  if (dbErr) return json({ error: 'Falha ao ler matches.', detail: dbErr.message }, 500)
  const db = (dbMatches ?? []) as DbMatch[]

  // Índices de apoio.
  const byExternal = new Map<number, DbMatch>()
  for (const d of db) if (d.external_id != null) byExternal.set(d.external_id, d)

  // Fila, por fase, de jogos "vazios" (sem external_id e sem times) — é o
  // esqueleto do mata-mata semeado. Vamos "encaixar" os jogos da API neles em
  // vez de criar duplicados.
  const skeleton = new Map<string, DbMatch[]>()
  for (const d of db) {
    if (d.external_id == null && !d.home_team && !d.away_team) {
      const arr = skeleton.get(d.stage) ?? []
      arr.push(d)
      skeleton.set(d.stage, arr)
    }
  }
  for (const arr of skeleton.values()) arr.sort((a, b) => a.ordering - b.ordering)

  // Próximo `ordering` livre por fase (para jogos criados do zero).
  const nextOrdering = new Map<string, number>()
  for (const d of db) nextOrdering.set(d.stage, Math.max(nextOrdering.get(d.stage) ?? 0, d.ordering))

  const claimed = new Set<string>() // ids do esqueleto já encaixados nesta execução
  const result = { criados: 0, vinculados: 0, placaresAtualizados: 0, preservadosManuais: 0, ignoradosPassados: 0, faseDesconhecida: [] as string[] }

  // Processa em ordem cronológica (ajuda a encaixar o esqueleto por data).
  const sorted = [...(api.matches ?? [])].sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

  for (const m of sorted) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) {
      if (!result.faseDesconhecida.includes(m.stage)) result.faseDesconhecida.push(m.stage)
      continue
    }

    const homeC = canonicalTeam(m.homeTeam?.name ?? m.homeTeam?.shortName)
    const awayC = canonicalTeam(m.awayTeam?.name ?? m.awayTeam?.shortName)
    const hasTeams = Boolean(homeC && awayC)

    // ---- Acha (ou cria) o jogo correspondente no banco ----
    let target = byExternal.get(m.id)

    if (!target && hasTeams) {
      // por par de times (qualquer ordem), entre jogos ainda não vinculados da mesma fase
      target = db.find((d) => {
        if (d.external_id != null || d.stage !== stage) return false
        const h = canonicalTeam(d.home_team)
        const a = canonicalTeam(d.away_team)
        if (!h || !a) return false
        return (h === homeC && a === awayC) || (h === awayC && a === homeC)
      })
    }

    if (!target) {
      // encaixa no próximo slot livre do esqueleto da fase (mata-mata semeado),
      // com ou sem times definidos — evita duplicar o jogo quando o chaveamento sai.
      const queue = skeleton.get(stage)
      if (queue) {
        const slot = queue.find((d) => !claimed.has(d.id))
        if (slot) {
          target = slot
          claimed.add(slot.id)
        }
      }
    }

    // ---- Decide times/orientação ----
    const teamsAlreadySet = Boolean(target?.home_team && target?.away_team)
    // Só define/atualiza nomes quando ainda não há times (não mexe em jogo já apostável).
    const setTeams = hasTeams && !teamsAlreadySet
    // swap = nossos times estão invertidos em relação à API (só relevante se já havia times)
    let swapped = false
    if (target && teamsAlreadySet && hasTeams) {
      swapped = canonicalTeam(target.home_team) === awayC && homeC !== awayC
    }

    // ---- CRIA se não existe e ainda não começou ----
    if (!target) {
      const naoComecou = m.status === 'SCHEDULED' || m.status === 'TIMED'
      if (!naoComecou) {
        result.ignoradosPassados++
        continue
      }
      const ordering = (nextOrdering.get(stage) ?? 0) + 1
      nextOrdering.set(stage, ordering)
      const label = stage === 'group' ? groupLabel(m.group) : null
      const { error: insErr } = await supabase.from('matches').insert({
        stage,
        ordering,
        label,
        home_team: displayTeam(m.homeTeam?.name ?? m.homeTeam?.shortName),
        away_team: displayTeam(m.awayTeam?.name ?? m.awayTeam?.shortName),
        kickoff: m.utcDate,
        external_id: m.id,
        result_source: 'api',
      })
      if (insErr) return json({ error: 'Falha ao criar jogo.', detail: insErr.message, apiId: m.id }, 500)
      result.criados++
      continue
    }

    // ---- ATUALIZA jogo existente (vincula external_id, ajusta data/times, placar) ----
    const patch: Record<string, unknown> = { external_id: m.id, kickoff: m.utcDate, last_synced_at: new Date().toISOString() }
    if (setTeams) {
      patch.home_team = displayTeam(m.homeTeam?.name ?? m.homeTeam?.shortName)
      patch.away_team = displayTeam(m.awayTeam?.name ?? m.awayTeam?.shortName)
    }
    if (target.external_id == null) result.vinculados++

    // Placar (se encerrado e não foi fechado à mão).
    const finishedApi = m.status === 'FINISHED' && m.score.fullTime.home != null && m.score.fullTime.away != null
    if (finishedApi) {
      if (target.finished && target.result_source === 'manual') {
        result.preservadosManuais++
      } else {
        let home = m.score.fullTime.home as number
        let away = m.score.fullTime.away as number
        let advancer: 'home' | 'away' | null =
          m.score.winner === 'HOME_TEAM' ? 'home' : m.score.winner === 'AWAY_TEAM' ? 'away' : null
        if (swapped) {
          ;[home, away] = [away, home]
          if (advancer === 'home') advancer = 'away'
          else if (advancer === 'away') advancer = 'home'
        }
        if (stage === 'group') advancer = null
        patch.home_score = home
        patch.away_score = away
        patch.advancer = advancer
        patch.finished = true
        patch.result_source = 'api'
        result.placaresAtualizados++
      }
    }

    const { error: upErr } = await supabase.from('matches').update(patch).eq('id', target.id)
    if (upErr) return json({ error: 'Falha ao atualizar jogo.', detail: upErr.message, matchId: target.id }, 500)
  }

  return json({ ok: true, ...result })
})
