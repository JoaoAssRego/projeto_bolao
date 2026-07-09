// ============================================================================
// Edge Function: sync-resultados-bsd (ARQUIVO ÚNICO — fácil de colar no painel)
// Importa os jogos de todos os torneios ativos cuja fonte é a BSD Football API
// (sports.bzzoiro.com) — Fase 2 do multi-torneio: Libertadores + Copa do Brasil.
// Ver docs/prd (se existir) e memória do projeto (project_multi_torneio.md)
// para os achados técnicos por trás das decisões deste arquivo.
//
// Espelha sync-resultados/index.ts (mesmos princípios, mesmos guard-rails),
// mas mais simples graças ao formato da BSD API: nomes de time já vêm limpos
// (sem dicionário de tradução) e os times têm id estável (sem casamento fuzzy
// por nome nem fila de "skeleton" pré-criada).
//
// Deploy (terminal):   supabase functions deploy sync-resultados-bsd --no-verify-jwt
// Segredos:            supabase secrets set BSD_API_TOKEN=seu_token
//                      supabase secrets set CRON_SECRET=<mesmo valor de sync-resultados>
//                      (SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já vêm do ambiente)
//
// Autorização: aceita a chamada do pg_cron (header x-cron-secret == CRON_SECRET)
// ou de um admin logado no app (JWT do usuário + current_is_admin() via RPC).
//
// Princípios (iguais a sync-resultados):
//  - Só CRIA jogo que ainda NÃO começou (status "notstarted"). Jogos já
//    ocorridos antes de entrarmos no torneio ficam de fora.
//  - Placar = home_score/away_score da BSD, que JÁ excluem pênaltis
//    (confirmado ao vivo: penalty_shootout é um objeto à parte). "Quem
//    avançou" é derivado exclusivamente desses dois campos — a BSD não expõe
//    (e não usamos) nenhum campo de vencedor agregado.
//  - NUNCA sobrescreve resultado lançado/corrigido à mão (finished + manual).
//  - NUNCA inverte a ordem mandante/visitante de um jogo que já tem times
//    definidos (isso corromperia palpites já feitos).
//  - Times de clube usam o nome bruto da API, sem tradução nem código ISO —
//    a UI já degrada bem pra time sem bandeira (mesma decisão da Fase 1).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BSD_API_BASE = 'https://sports.bzzoiro.com/api/v2'

// ----------------------------------------------------------------------------
// Mapeamento de fase: round_name (texto exato da BSD) -> Stage interno.
// Regra travada por teste ao vivo contra a API real (2026-07-08):
//  - round_name NÃO-VAZIO manda, mesmo que round_number/group_name pareçam
//    indicar outra coisa (a BSD deixa resíduo de group_name em jogos de mata-
//    mata, e reaproveita round_number entre fases diferentes).
//  - round_name VAZIO + group_name preenchido => fase de grupos.
//  - round_name desconhecido cai em faseDesconhecida (visível no resultado do
//    sync) em vez de ser silenciosamente descartado.
// ----------------------------------------------------------------------------
const ROUND_NAME_MAP: Record<string, Record<string, string>> = {
  LIB: {
    'Qualification Round 1': 'lib_q1',
    'Qualification Round 2': 'lib_q2',
    'Qualification Round 3': 'lib_q3',
    'Round of 16': 'r16',
    'Quarter-finals': 'qf',
    'Semi-finals': 'sf',
    Final: 'final',
  },
  CDB: {
    'Round 1': 'cdb_f1',
    'Round 2': 'cdb_f2',
    'Round 3': 'cdb_f3',
    'Round 4': 'cdb_f4',
    'Round 5': 'cdb_r32',
    'Round of 16': 'r16',
    'Quarter-finals': 'qf',
    'Semi-finals': 'sf',
    Final: 'final',
  },
}

// Estágios que podem ter confrontos de ida e volta (mata-mata de clubes).
// Fases de jogo único (cdb_f1..cdb_f4) não entram aqui: o algoritmo de
// pareamento já lida com elas corretamente por não achar par (ver
// linkTiesForTorneio), mas listar aqui evita trabalho à toa.
const TWO_LEG_CAPABLE_STAGES = new Set(['lib_q1', 'lib_q2', 'lib_q3', 'cdb_r32', 'r32', 'r16', 'qf', 'sf'])

interface Torneio {
  id: string
  nome: string
  slug: string
  competition_code: string
  data_source: string
  bsd_league_id: number
  bsd_season_id: number
}

interface ApiEvent {
  id: number
  home_team_id: number
  away_team_id: number
  home_team: string | null
  away_team: string | null
  event_date: string
  status: string
  round_name: string
  group_name: string | null
  home_score: number | null
  away_score: number | null
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
  tie_id: string | null
  leg: 'ida' | 'volta' | null
  home_score: number | null
  away_score: number | null
  advancer: 'home' | 'away' | null
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// Mesmo formato de rótulo de grupo usado em sync-resultados (a BSD já manda
// "Group A" em vez de "GROUP_A", mas o regex é case-insensitive e cobre os dois).
function groupLabel(g: string | null): string | null {
  if (!g) return null
  const m = /GROUP[_\s-]?([A-Z])/i.exec(g)
  return m ? `Grupo ${m[1].toUpperCase()}` : null
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

async function fetchAllEvents(leagueId: number, seasonId: number, token: string): Promise<ApiEvent[]> {
  const events: ApiEvent[] = []
  let url: string | null =
    `${BSD_API_BASE}/events/?league_id=${leagueId}&season_id=${seasonId}&limit=200`

  while (url) {
    let lastErr: unknown
    let res: Response | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await fetch(url, { headers: { Authorization: `Token ${token}` } })
        break
      } catch (e) {
        lastErr = e
        if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt))
      }
    }
    if (!res) throw new SyncError('Falha ao chamar a BSD Football API.', 502, String(lastErr))
    if (!res.ok) throw new SyncError(`BSD Football API respondeu ${res.status}`, 502, await res.text())
    const body = (await res.json()) as { results: ApiEvent[]; next: string | null }
    events.push(...body.results)
    url = body.next
  }
  return events
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

// Chave de pareamento ida/volta: par de team_id (estável na BSD, sem precisar
// de normalização de nome). Ver comentário equivalente em sync-resultados
// (tieTeamKey) — aqui é mais simples porque a BSD já dá um id numérico.
function tieKey(stage: string, homeId: number, awayId: number): string {
  return `${stage}:${[homeId, awayId].sort((a, b) => a - b).join('|')}`
}

// Mesmo algoritmo de linkTiesForTorneio (sync-resultados), reimplementado com
// team_id em vez de nome normalizado. Idempotente. Fases de jogo único (ex:
// cdb_f1..cdb_f4 da Copa do Brasil) nunca formam grupo de tamanho 2, então
// simplesmente não são linkadas — comportamento correto sem caso especial.
//
// Uma única leitura + um único upsert em lote (em vez de um update por
// partida): com até ~32 pernas de mata-mata por torneio, fazer isso um a um
// facilmente passa do timeout de execução da Edge Function (foi o que
// aconteceu na primeira versão — a chamada nunca respondia).
async function linkTiesForTorneio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  torneio: Torneio,
  homeAwayIdByMatchId: Map<string, { home: number; away: number }>,
): Promise<number> {
  // Seleciona a linha inteira (não só id/tie_id/leg): o upsert em lote monta
  // um INSERT ... ON CONFLICT DO UPDATE por baixo, e o Postgres valida as
  // colunas NOT NULL da linha candidata de insert ANTES de decidir se vai
  // atualizar — um upsert parcial (só {id, tie_id, leg}) quebra com "null
  // value in column stage violates not-null constraint" mesmo a linha já
  // existindo. Por isso toda escrita em lote deste arquivo manda a linha completa.
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, stage, ordering, label, home_team, away_team, kickoff, external_id, result_source, finished, tie_id, leg, home_score, away_score, advancer',
    )
    .eq('torneio_id', torneio.id)
    .in('stage', [...TWO_LEG_CAPABLE_STAGES])
  if (error) throw new SyncError('Falha ao ler matches para pareamento ida/volta.', 500, error.message)

  const rows = (data ?? []) as DbMatch[]
  const groups = new Map<string, DbMatch[]>()
  for (const m of rows) {
    const ids = homeAwayIdByMatchId.get(m.id)
    if (!ids) continue // jogo antigo sem team_id conhecido nesta execução — ignora
    const key = tieKey(m.stage, ids.home, ids.away)
    const arr = groups.get(key) ?? []
    arr.push(m)
    groups.set(key, arr)
  }

  const changes: Record<string, unknown>[] = []
  for (const group of groups.values()) {
    if (group.length !== 2) continue // só pareia quando as duas pernas já existem
    const tieId = group.find((g) => g.tie_id)?.tie_id ?? crypto.randomUUID()
    const sorted = [...group].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    const legs: Array<'ida' | 'volta'> = ['ida', 'volta']
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]
      if (m.tie_id === tieId && m.leg === legs[i]) continue
      changes.push({ ...m, torneio_id: torneio.id, tie_id: tieId, leg: legs[i] })
    }
  }

  if (changes.length === 0) return 0
  const { error: upErr } = await supabase.from('matches').upsert(changes, { onConflict: 'id' })
  if (upErr) throw new SyncError('Falha ao linkar ida/volta.', 500, upErr.message)
  return changes.length
}

async function syncTorneio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  torneio: Torneio,
  token: string,
) {
  const result = {
    torneio: torneio.slug,
    criados: 0,
    vinculados: 0,
    placaresAtualizados: 0,
    preservadosManuais: 0,
    ignoradosPassados: 0,
    idaVoltaLinkados: 0,
    faseDesconhecida: [] as string[],
  }

  const roundMap = ROUND_NAME_MAP[torneio.competition_code] ?? {}
  const events = await fetchAllEvents(torneio.bsd_league_id, torneio.bsd_season_id, token)

  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select(
      'id, stage, ordering, label, home_team, away_team, kickoff, external_id, result_source, finished, tie_id, leg, home_score, away_score, advancer',
    )
    .eq('torneio_id', torneio.id)
  if (dbErr) throw new SyncError('Falha ao ler matches.', 500, dbErr.message)
  const db = (dbMatches ?? []) as DbMatch[]

  const byExternal = new Map<number, DbMatch>()
  for (const d of db) if (d.external_id != null) byExternal.set(d.external_id, d)

  const nextOrdering = new Map<string, number>()
  for (const d of db) nextOrdering.set(d.stage, Math.max(nextOrdering.get(d.stage) ?? 0, d.ordering))

  // team_id por match.id (usado depois pelo pareamento ida/volta) — só cobre
  // os jogos que apareceram nesta execução, o que é suficiente na prática
  // (o pareamento roda toda vez que o sync roda).
  const homeAwayIdByMatchId = new Map<string, { home: number; away: number }>()

  const sorted = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  // Toda escrita (insert OU update) vira uma linha completa aqui, e no final
  // uma ÚNICA chamada de upsert grava tudo. Ler ~142 eventos e escrever um a
  // um (a versão original) facilmente passa do timeout de execução da Edge
  // Function — foi exatamente por isso que a primeira invocação nunca
  // respondeu. Como cada linha aqui carrega o estado completo (não um patch
  // parcial), todas têm o mesmo formato de colunas, o que o upsert exige pra
  // funcionar corretamente em lote.
  const rows: Record<string, unknown>[] = []

  for (const ev of sorted) {
    const stage =
      ev.round_name && ev.round_name.length > 0
        ? roundMap[ev.round_name]
        : ev.group_name
          ? 'group'
          : undefined

    if (!stage) {
      const faseLabel = ev.round_name || '(fase de grupos sem group_name)'
      if (!result.faseDesconhecida.includes(faseLabel)) result.faseDesconhecida.push(faseLabel)
      continue
    }

    let target = byExternal.get(ev.id)

    if (!target) {
      target = db.find((d) => {
        if (d.external_id != null || d.stage !== stage) return false
        // Casamento por nome só entra como fallback pra jogo pré-existente
        // sem external_id (não deveria acontecer na prática pra estes
        // torneios, já que não há skeleton pré-criado, mas cobre o caso de
        // um admin ter cadastrado um jogo à mão).
        return (
          (d.home_team === ev.home_team && d.away_team === ev.away_team) ||
          (d.home_team === ev.away_team && d.away_team === ev.home_team)
        )
      })
    }

    const teamsAlreadySet = Boolean(target?.home_team && target?.away_team)
    let swapped = false
    if (target && teamsAlreadySet) {
      swapped = target.home_team === ev.away_team && ev.home_team !== ev.away_team
    }

    if (!target) {
      if (ev.status !== 'notstarted') {
        result.ignoradosPassados++
        continue
      }
      const ordering = (nextOrdering.get(stage) ?? 0) + 1
      nextOrdering.set(stage, ordering)
      const label = stage === 'group' ? groupLabel(ev.group_name) : null
      const id = crypto.randomUUID()
      rows.push({
        id,
        torneio_id: torneio.id,
        stage,
        ordering,
        label,
        home_team: ev.home_team,
        away_team: ev.away_team,
        home_team_id: ev.home_team_id,
        away_team_id: ev.away_team_id,
        kickoff: ev.event_date,
        external_id: ev.id,
        result_source: 'api',
        finished: false,
        tie_id: null,
        leg: null,
        home_score: null,
        away_score: null,
        advancer: null,
        last_synced_at: new Date().toISOString(),
      })
      result.criados++
      homeAwayIdByMatchId.set(id, { home: ev.home_team_id, away: ev.away_team_id })
      continue
    }

    homeAwayIdByMatchId.set(target.id, swapped
      ? { home: ev.away_team_id, away: ev.home_team_id }
      : { home: ev.home_team_id, away: ev.away_team_id })

    // Linha completa: parte do estado atual de `target` e só sobrescreve o
    // que de fato muda — preserva tie_id/leg (o pareamento roda depois, numa
    // segunda passada) e o placar/resultado quando não há nada novo a aplicar.
    const row: Record<string, unknown> = {
      id: target.id,
      torneio_id: torneio.id,
      stage: target.stage,
      ordering: target.ordering,
      label: target.label,
      home_team: teamsAlreadySet ? target.home_team : ev.home_team,
      away_team: teamsAlreadySet ? target.away_team : ev.away_team,
      home_team_id: swapped ? ev.away_team_id : ev.home_team_id,
      away_team_id: swapped ? ev.home_team_id : ev.away_team_id,
      kickoff: ev.event_date,
      external_id: ev.id,
      result_source: target.result_source,
      finished: target.finished,
      tie_id: target.tie_id,
      leg: target.leg,
      home_score: target.home_score,
      away_score: target.away_score,
      advancer: target.advancer,
      last_synced_at: new Date().toISOString(),
    }
    if (target.external_id == null) result.vinculados++

    const finishedApi = ev.status === 'finished' && ev.home_score != null && ev.away_score != null
    if (finishedApi) {
      if (target.finished && target.result_source === 'manual') {
        result.preservadosManuais++
      } else {
        let home = ev.home_score as number
        let away = ev.away_score as number
        if (swapped) [home, away] = [away, home]

        let advancer: 'home' | 'away' | null = home === away ? null : home > away ? 'home' : 'away'
        if (stage === 'group' || stage === 'league_phase') advancer = null

        row.home_score = home
        row.away_score = away
        row.advancer = advancer
        row.finished = true
        row.result_source = 'api'
        result.placaresAtualizados++
      }
    }

    rows.push(row)
  }

  if (rows.length > 0) {
    const { error: upErr } = await supabase.from('matches').upsert(rows, { onConflict: 'id' })
    if (upErr) throw new SyncError('Falha ao gravar jogos.', 500, upErr.message)
  }

  result.idaVoltaLinkados = await linkTiesForTorneio(supabase, torneio, homeAwayIdByMatchId)

  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const token = Deno.env.get('BSD_API_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) return json({ error: 'BSD_API_TOKEN não configurado.' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  if (!(await isAuthorized(req, supabaseUrl))) return json({ error: 'Não autorizado.' }, 401)

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: torneiosData, error: torneiosErr } = await supabase
    .from('torneios')
    .select('id, nome, slug, competition_code, data_source, bsd_league_id, bsd_season_id')
    .eq('is_active', true)
    .eq('data_source', 'bsd-football-api')
  if (torneiosErr) return json({ error: 'Falha ao ler torneios.', detail: torneiosErr.message }, 500)

  const torneiosAtivos = (torneiosData ?? []) as Torneio[]
  if (torneiosAtivos.length === 0) {
    return json({ ok: true, skipped: true, reason: 'Nenhum torneio ativo com fonte bsd-football-api.' })
  }

  const porTorneio: Record<string, unknown> = {}
  let houveErro = false

  for (const torneio of torneiosAtivos) {
    try {
      const result = await syncTorneio(supabase, torneio, token)
      porTorneio[torneio.slug] = result
      await supabase.from('sync_logs').insert({ function_name: 'sync-resultados-bsd', status: 'ok', summary: result })
    } catch (e) {
      houveErro = true
      const status = e instanceof SyncError ? e.status : 500
      const detail = e instanceof SyncError ? e.detail : String(e)
      const message = e instanceof Error ? e.message : 'Erro inesperado.'
      porTorneio[torneio.slug] = { error: message, detail, status }
      await supabase
        .from('sync_logs')
        .insert({ function_name: 'sync-resultados-bsd', status: 'error', summary: { torneio: torneio.slug, error: message, detail } })
    }
  }

  return json({ ok: !houveErro, porTorneio }, houveErro ? 207 : 200)
})
