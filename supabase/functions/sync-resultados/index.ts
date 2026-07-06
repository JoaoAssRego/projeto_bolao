// ============================================================================
// Edge Function: sync-resultados (ARQUIVO ÚNICO — fácil de colar no painel)
// Importa os jogos de todos os torneios ativos cuja fonte é a football-data.org
// (Fase 1 do multi-torneio: Copa do Mundo + Champions League — ver
// docs/prd/prd-multi-torneio-champions-league.md) e mantém a tabela `matches`
// em dia: CRIA os jogos que ainda vão acontecer (grupos/fase liga + mata-mata),
// atualiza times/horário e preenche o PLACAR dos jogos encerrados.
// Pensada para rodar via pg_cron (ver supabase/migrations/0009_sync_observability_cron.sql).
//
// Libertadores e Copa do Brasil (Fase 2) não são cobertas aqui: a
// football-data.org só as oferece no plano pago, então entram via uma segunda
// função com uma segunda fonte de dados quando essa fase começar.
//
// Deploy (terminal):   supabase functions deploy sync-resultados --no-verify-jwt
// Deploy (painel):     Edge Functions > sync-resultados > Edit > colar > Deploy
// Segredos:            supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
//                      supabase secrets set CRON_SECRET=<valor gerado em vault.decrypted_secrets>
//                      (SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já vêm do ambiente)
//
// Autorização: aceita a chamada do pg_cron (header x-cron-secret == CRON_SECRET)
// ou de um admin logado no app (JWT do usuário + current_is_admin() via RPC).
// Por isso o deploy usa --no-verify-jwt: a checagem é feita aqui dentro, não
// mais pela verificação padrão de JWT do Supabase (que só exigia uma anon key
// válida — pública por natureza, não protegia nada de fato).
//
// Princípios:
//  - Só CRIA jogo que ainda NÃO começou (status SCHEDULED/TIMED). Jogos já
//    ocorridos antes de entrarmos no torneio ficam de fora (não dá pra apostar
//    no passado) — alinhado à ESPECIFICACAO.md.
//  - Placar = score.fullTime (tempo normal + prorrogação; pênaltis NÃO contam
//    para o placar). "Quem avançou" = score.winner (considera pênaltis) — em
//    confrontos de ida/volta, isso representa apenas o vencedor DAQUELA perna,
//    não do confronto agregado (decisão de produto: cada perna pontua isolada).
//  - NUNCA sobrescreve resultado lançado/corrigido à mão (finished + manual).
//  - NUNCA inverte a ordem mandante/visitante de um jogo que já tem times
//    definidos (isso corromperia palpites já feitos).
//  - Times de seleção (Copa do Mundo) passam pelo mapa de canonicalização e
//    ganham nome em PT + código ISO pra bandeira. Times de clube (Champions e,
//    na Fase 2, Libertadores/Copa do Brasil) usam o nome bruto da API, sem
//    tradução nem código ISO — a UI já degrada bem pra time sem bandeira.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ----------------------------------------------------------------------------
// Mapa de seleções (só usado quando torneio.competition_code === 'WC'): casa o
// nome que o admin/usuário vê (PT) com o que a API devolve (EN). Primeira
// forma de cada linha é a canônica.
// ----------------------------------------------------------------------------
const TEAMS: string[][] = [
  ['brazil', 'brasil'],
  ['argentina'],
  ['france', 'franca', 'frança'],
  ['england', 'inglaterra'],
  ['spain', 'espanha'],
  ['portugal'],
  ['germany', 'alemanha'],
  ['netherlands', 'holanda', 'paises baixos', 'países baixos'],
  ['belgium', 'belgica', 'bélgica'],
  ['croatia', 'croacia', 'croácia'],
  ['italy', 'italia', 'itália'],
  ['uruguay', 'uruguai'],
  ['colombia', 'colômbia'],
  ['mexico', 'méxico'],
  ['united states', 'usa', 'estados unidos', 'eua'],
  ['canada', 'canadá'],
  ['japan', 'japao', 'japão'],
  ['south korea', 'coreia do sul', 'coréia do sul', 'korea republic'],
  ['australia'],
  ['morocco', 'marrocos'],
  ['senegal'],
  ['ghana'],
  ['nigeria', 'nigéria'],
  ['cameroon', 'camaroes', 'camarões'],
  ['ivory coast', 'cote divoire', "cote d'ivoire", 'costa do marfim'],
  ['egypt', 'egito'],
  ['tunisia', 'tunísia'],
  ['algeria', 'argelia', 'argélia'],
  ['switzerland', 'suica', 'suíça'],
  ['denmark', 'dinamarca'],
  ['poland', 'polonia', 'polônia'],
  ['serbia', 'servia', 'sérvia'],
  ['austria', 'áustria'],
  ['ecuador', 'equador'],
  ['peru'],
  ['chile'],
  ['paraguay', 'paraguai'],
  ['saudi arabia', 'arabia saudita', 'arábia saudita'],
  ['iran', 'ira', 'irã'],
  ['qatar', 'catar'],
  ['wales', 'pais de gales', 'país de gales'],
  ['scotland', 'escocia', 'escócia'],
  ['norway', 'noruega'],
  ['sweden', 'suecia', 'suécia'],
  ['turkey', 'turkiye', 'turquia'],
  ['ukraine', 'ucrania', 'ucrânia'],
  ['costa rica'],
  ['panama', 'panamá'],
  ['honduras'],
  ['jamaica'],
  ['new zealand', 'nova zelandia', 'nova zelândia'],
  ['greece', 'grecia', 'grécia'],
  ['czechia', 'czech republic', 'republica tcheca', 'república tcheca', 'tchequia', 'tchéquia'],
  ['hungary', 'hungria'],
  ['slovenia', 'eslovenia', 'eslovênia'],
  ['slovakia', 'eslovaquia', 'eslováquia'],
  ['romania', 'romenia', 'romênia'],
  ['russia', 'rússia'],
  ['bolivia', 'bolívia'],
  ['venezuela'],
  ['south africa', 'africa do sul', 'áfrica do sul'],
  ['cape verde', 'cabo verde'],
  ['jordan', 'jordania', 'jordânia'],
  ['uzbekistan', 'uzbequistao', 'uzbequistão'],
  ['curacao', 'curaçao'],
  ['haiti'],
  ['dr congo', 'congo dr', 'democratic republic of congo', 'dr. congo', 'república democrática do congo'],
  ['mali'],
  ['ethiopia', 'etiópia'],
  ['guinea', 'guiné'],
  ['mozambique', 'moçambique'],
  ['luxembourg', 'luxemburgo'],
  ['kosovo'],
  ['iceland', 'islândia'],
  ['ireland', 'irlanda'],
  ['finland', 'finlândia'],
  ['albania', 'albânia'],
  ['georgia', 'geórgia'],
  ['trinidad and tobago', 'trinidad e tobago'],
  ['fiji'],
  ['indonesia', 'indonésia'],
  ['thailand', 'tailândia'],
  ['united arab emirates', 'uae', 'emirados árabes unidos', 'emirados arabes unidos'],
  ['bahrain', 'bahrein'],
  ['oman', 'omã'],
  ['kuwait'],
  ['iraq', 'iraque'],
  ['china'],
]

const PT_DISPLAY: Record<string, string> = {
  brazil: 'Brasil', argentina: 'Argentina', france: 'França', england: 'Inglaterra',
  spain: 'Espanha', portugal: 'Portugal', germany: 'Alemanha', netherlands: 'Holanda',
  belgium: 'Bélgica', croatia: 'Croácia', italy: 'Itália', uruguay: 'Uruguai',
  colombia: 'Colômbia', mexico: 'México', 'united states': 'Estados Unidos', canada: 'Canadá',
  japan: 'Japão', 'south korea': 'Coreia do Sul', australia: 'Austrália', morocco: 'Marrocos',
  senegal: 'Senegal', ghana: 'Gana', nigeria: 'Nigéria', cameroon: 'Camarões',
  'ivory coast': 'Costa do Marfim', egypt: 'Egito', tunisia: 'Tunísia', algeria: 'Argélia',
  switzerland: 'Suíça', denmark: 'Dinamarca', poland: 'Polônia', serbia: 'Sérvia',
  austria: 'Áustria', ecuador: 'Equador', peru: 'Peru', chile: 'Chile', paraguay: 'Paraguai',
  'saudi arabia': 'Arábia Saudita', iran: 'Irã', qatar: 'Catar', wales: 'País de Gales',
  scotland: 'Escócia', norway: 'Noruega', sweden: 'Suécia', turkey: 'Turquia', ukraine: 'Ucrânia',
  'costa rica': 'Costa Rica', panama: 'Panamá', honduras: 'Honduras', jamaica: 'Jamaica',
  'new zealand': 'Nova Zelândia', greece: 'Grécia', czechia: 'República Tcheca', hungary: 'Hungria',
  slovenia: 'Eslovênia', slovakia: 'Eslováquia', romania: 'Romênia', russia: 'Rússia',
  bolivia: 'Bolívia', venezuela: 'Venezuela', 'south africa': 'África do Sul', 'cape verde': 'Cabo Verde',
  jordan: 'Jordânia', uzbekistan: 'Uzbequistão', curacao: 'Curaçao', haiti: 'Haiti',
  'dr congo': 'República Democrática do Congo', mali: 'Mali', ethiopia: 'Etiópia',
  guinea: 'Guiné', mozambique: 'Moçambique', luxembourg: 'Luxemburgo', kosovo: 'Kosovo',
  iceland: 'Islândia', ireland: 'Irlanda', finland: 'Finlândia', albania: 'Albânia',
  georgia: 'Geórgia', 'trinidad and tobago': 'Trinidad e Tobago', fiji: 'Fiji',
  indonesia: 'Indonésia', thailand: 'Tailândia', 'united arab emirates': 'Emirados Árabes Unidos',
  bahrain: 'Bahrein', oman: 'Omã', kuwait: 'Kuwait', iraq: 'Iraque', china: 'China',
}

const TEAM_ISO: Record<string, string> = {
  brazil: 'BR', argentina: 'AR', france: 'FR', england: 'GBENG',
  spain: 'ES', portugal: 'PT', germany: 'DE', netherlands: 'NL',
  belgium: 'BE', croatia: 'HR', italy: 'IT', uruguay: 'UY',
  colombia: 'CO', mexico: 'MX', 'united states': 'US', canada: 'CA',
  japan: 'JP', 'south korea': 'KR', australia: 'AU', morocco: 'MA',
  senegal: 'SN', ghana: 'GH', nigeria: 'NG', cameroon: 'CM',
  'ivory coast': 'CI', egypt: 'EG', tunisia: 'TN', algeria: 'DZ',
  switzerland: 'CH', denmark: 'DK', poland: 'PL', serbia: 'RS',
  austria: 'AT', ecuador: 'EC', peru: 'PE', chile: 'CL', paraguay: 'PY',
  'saudi arabia': 'SA', iran: 'IR', qatar: 'QA', wales: 'GBWLS',
  scotland: 'GBSCT', norway: 'NO', sweden: 'SE', turkey: 'TR', ukraine: 'UA',
  'costa rica': 'CR', panama: 'PA', honduras: 'HN', jamaica: 'JM',
  'new zealand': 'NZ', greece: 'GR', czechia: 'CZ', hungary: 'HU',
  slovenia: 'SI', slovakia: 'SK', romania: 'RO', russia: 'RU',
  bolivia: 'BO', venezuela: 'VE', 'south africa': 'ZA', 'cape verde': 'CV',
  jordan: 'JO', uzbekistan: 'UZ', curacao: 'CW', haiti: 'HT',
  'dr congo': 'CD', mali: 'ML', ethiopia: 'ET', guinea: 'GN',
  mozambique: 'MZ', luxembourg: 'LU', kosovo: 'XK', iceland: 'IS',
  ireland: 'IE', finland: 'FI', albania: 'AL', georgia: 'GE',
  'trinidad and tobago': 'TT', fiji: 'FJ', indonesia: 'ID', thailand: 'TH',
  'united arab emirates': 'AE', bahrain: 'BH', oman: 'OM', kuwait: 'KW',
  iraq: 'IQ', china: 'CN', 'el salvador': 'SV', guatemala: 'GT', cuba: 'CU',
}

function normalizeTeam(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CANONICAL = new Map<string, string>()
for (const group of TEAMS) for (const v of group) CANONICAL.set(normalizeTeam(v), group[0])

function canonicalTeam(raw: string | null | undefined): string | null {
  if (!raw) return null
  const norm = normalizeTeam(raw)
  return norm ? (CANONICAL.get(norm) ?? norm) : null
}

// Times de clube (qualquer competição que não seja seleção) usam o nome bruto
// da API — sem tradução, sem código ISO. A UI já cai graciosamente pra um
// ícone genérico quando não há bandeira (ver getFlag em src/lib/countryFlags.ts).
const NATIONAL_TEAM_COMPETITIONS = new Set(['WC'])

function displayTeam(raw: string | null | undefined, competitionCode: string): string | null {
  if (!raw) return null
  if (!NATIONAL_TEAM_COMPETITIONS.has(competitionCode)) return raw.trim()
  const c = canonicalTeam(raw)
  return (c && PT_DISPLAY[c]) ?? raw
}

function isoCode(raw: string | null | undefined, competitionCode: string): string | null {
  if (!raw) return null
  if (!NATIONAL_TEAM_COMPETITIONS.has(competitionCode)) return null
  const c = canonicalTeam(raw)
  return (c && TEAM_ISO[c]) ?? null
}

// Chave de pareamento ida/volta: usa a canonicalização de seleção quando
// aplicável, senão nome normalizado bruto — o suficiente pra casar as duas
// pernas do mesmo confronto de clubes.
function tieTeamKey(raw: string | null | undefined, competitionCode: string): string {
  if (!raw) return ''
  if (NATIONAL_TEAM_COMPETITIONS.has(competitionCode)) return canonicalTeam(raw) ?? normalizeTeam(raw)
  return normalizeTeam(raw)
}

// ----------------------------------------------------------------------------
// Sync
// ----------------------------------------------------------------------------
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  // Fase liga da Champions (desde 2024/25): não confirmado ainda contra a API
  // real (a temporada 2026/27 ainda não publicou calendário quando este PRD
  // foi escrito) — os dois nomes mais plausíveis do vocabulário da
  // football-data.org estão mapeados; se nenhum bater, o jogo cai em
  // `faseDesconhecida` no resultado do sync (visível no painel admin) em vez
  // de ser perdido silenciosamente.
  LEAGUE_STAGE: 'league_phase',
  LEAGUE_PHASE: 'league_phase',
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

// Estágios que podem ter confrontos de ida e volta (mata-mata de clubes).
const TWO_LEG_CAPABLE_STAGES = new Set(['r32', 'r16', 'qf', 'sf'])

interface Torneio {
  id: string
  nome: string
  slug: string
  competition_code: string
  data_source: string
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
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null
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
  tie_id: string | null
  leg: 'ida' | 'volta' | null
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

// football-data.org de vez em quando falha a conexão no meio do handshake TLS
// (erro de rede transitório, não um erro da API em si) — tenta mais duas vezes
// antes de desistir, para não perder um ciclo inteiro de 30 min por causa disso.
async function fetchApiMatches(competitionCode: string, token: string): Promise<{ matches: ApiMatch[] }> {
  const apiUrl = `https://api.football-data.org/v4/competitions/${competitionCode}/matches`
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(apiUrl, { headers: { 'X-Auth-Token': token } })
      if (!res.ok) throw new SyncError(`football-data.org respondeu ${res.status}`, 502, await res.text())
      return await res.json()
    } catch (e) {
      if (e instanceof SyncError) throw e
      lastErr = e
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new SyncError('Falha ao chamar a API.', 502, String(lastErr))
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

// Depois de sincronizar um torneio, casa pares de jogos do mesmo estágio de
// mata-mata e mesmo confronto de times num `tie_id` comum, rotulando o mais
// antigo como 'ida' e o mais recente como 'volta'. Idempotente: reaproveita o
// tie_id já salvo se algum dos dois já tiver um. Puramente informativo na UI
// — não afeta pontuação (cada perna já pontuou isolada no loop principal).
async function linkTiesForTorneio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  torneio: Torneio,
): Promise<number> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, stage, home_team, away_team, kickoff, tie_id, leg')
    .eq('torneio_id', torneio.id)
    .in('stage', [...TWO_LEG_CAPABLE_STAGES])
  if (error) throw new SyncError('Falha ao ler matches para pareamento ida/volta.', 500, error.message)

  const rows = (data ?? []) as DbMatch[]
  const groups = new Map<string, DbMatch[]>()
  for (const m of rows) {
    if (!m.home_team || !m.away_team) continue
    const key = `${m.stage}:${[tieTeamKey(m.home_team, torneio.competition_code), tieTeamKey(m.away_team, torneio.competition_code)].sort().join('|')}`
    const arr = groups.get(key) ?? []
    arr.push(m)
    groups.set(key, arr)
  }

  let linked = 0
  for (const group of groups.values()) {
    if (group.length !== 2) continue // só pareia quando as duas pernas já existem
    const tieId = group.find((g) => g.tie_id)?.tie_id ?? crypto.randomUUID()
    const sorted = [...group].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    const legs: Array<'ida' | 'volta'> = ['ida', 'volta']
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]
      if (m.tie_id === tieId && m.leg === legs[i]) continue
      const { error: upErr } = await supabase.from('matches').update({ tie_id: tieId, leg: legs[i] }).eq('id', m.id)
      if (upErr) throw new SyncError('Falha ao linkar ida/volta.', 500, upErr.message)
      linked++
    }
  }
  return linked
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

  const api = await fetchApiMatches(torneio.competition_code, token)

  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, stage, ordering, label, home_team, away_team, kickoff, external_id, result_source, finished, tie_id, leg')
    .eq('torneio_id', torneio.id)
  if (dbErr) throw new SyncError('Falha ao ler matches.', 500, dbErr.message)
  const db = (dbMatches ?? []) as DbMatch[]

  const byExternal = new Map<number, DbMatch>()
  for (const d of db) if (d.external_id != null) byExternal.set(d.external_id, d)

  const skeleton = new Map<string, DbMatch[]>()
  for (const d of db) {
    if (d.external_id == null && !d.home_team && !d.away_team) {
      const arr = skeleton.get(d.stage) ?? []
      arr.push(d)
      skeleton.set(d.stage, arr)
    }
  }
  for (const arr of skeleton.values()) arr.sort((a, b) => a.ordering - b.ordering)

  const nextOrdering = new Map<string, number>()
  for (const d of db) nextOrdering.set(d.stage, Math.max(nextOrdering.get(d.stage) ?? 0, d.ordering))

  const claimed = new Set<string>()

  const sorted = [...(api.matches ?? [])].sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

  for (const m of sorted) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) {
      if (!result.faseDesconhecida.includes(m.stage)) result.faseDesconhecida.push(m.stage)
      continue
    }

    const homeKey = tieTeamKey(m.homeTeam?.name ?? m.homeTeam?.shortName, torneio.competition_code)
    const awayKey = tieTeamKey(m.awayTeam?.name ?? m.awayTeam?.shortName, torneio.competition_code)
    const hasTeams = Boolean(homeKey && awayKey)

    let target = byExternal.get(m.id)

    if (!target && hasTeams) {
      target = db.find((d) => {
        if (d.external_id != null || d.stage !== stage) return false
        const h = tieTeamKey(d.home_team, torneio.competition_code)
        const a = tieTeamKey(d.away_team, torneio.competition_code)
        if (!h || !a) return false
        return (h === homeKey && a === awayKey) || (h === awayKey && a === homeKey)
      })
    }

    if (!target) {
      const queue = skeleton.get(stage)
      if (queue) {
        const slot = queue.find((d) => !claimed.has(d.id))
        if (slot) {
          target = slot
          claimed.add(slot.id)
        }
      }
    }

    const teamsAlreadySet = Boolean(target?.home_team && target?.away_team)
    const setTeams = hasTeams && !teamsAlreadySet
    let swapped = false
    if (target && teamsAlreadySet && hasTeams) {
      swapped = tieTeamKey(target.home_team, torneio.competition_code) === awayKey && homeKey !== awayKey
    }

    if (!target) {
      const naoComecou = m.status === 'SCHEDULED' || m.status === 'TIMED'
      if (!naoComecou) {
        result.ignoradosPassados++
        continue
      }
      const ordering = (nextOrdering.get(stage) ?? 0) + 1
      nextOrdering.set(stage, ordering)
      const label = stage === 'group' ? groupLabel(m.group) : null
      const homeRaw = m.homeTeam?.name ?? m.homeTeam?.shortName
      const awayRaw = m.awayTeam?.name ?? m.awayTeam?.shortName
      const { error: insErr } = await supabase.from('matches').insert({
        torneio_id: torneio.id,
        stage,
        ordering,
        label,
        home_team: displayTeam(homeRaw, torneio.competition_code),
        away_team: displayTeam(awayRaw, torneio.competition_code),
        home_team_code: isoCode(homeRaw, torneio.competition_code),
        away_team_code: isoCode(awayRaw, torneio.competition_code),
        kickoff: m.utcDate,
        external_id: m.id,
        result_source: 'api',
      })
      if (insErr) throw new SyncError('Falha ao criar jogo.', 500, { detail: insErr.message, apiId: m.id })
      result.criados++
      continue
    }

    const patch: Record<string, unknown> = {
      external_id: m.id,
      kickoff: m.utcDate,
      last_synced_at: new Date().toISOString(),
    }
    const homeRaw = m.homeTeam?.name ?? m.homeTeam?.shortName
    const awayRaw = m.awayTeam?.name ?? m.awayTeam?.shortName
    if (setTeams) {
      patch.home_team = displayTeam(homeRaw, torneio.competition_code)
      patch.away_team = displayTeam(awayRaw, torneio.competition_code)
    }
    if (hasTeams) {
      patch.home_team_code = isoCode(homeRaw, torneio.competition_code)
      patch.away_team_code = isoCode(awayRaw, torneio.competition_code)
    }
    if (target.external_id == null) result.vinculados++

    const finishedApi = m.status === 'FINISHED' && m.score.fullTime.home != null && m.score.fullTime.away != null
    if (finishedApi) {
      if (target.finished && target.result_source === 'manual') {
        result.preservadosManuais++
      } else {
        let advancer: 'home' | 'away' | null =
          m.score.winner === 'HOME_TEAM' ? 'home' : m.score.winner === 'AWAY_TEAM' ? 'away' : null
        if (swapped) {
          if (advancer === 'home') advancer = 'away'
          else if (advancer === 'away') advancer = 'home'
        }
        if (stage === 'group' || stage === 'league_phase') advancer = null

        // Quando a partida foi decidida nos pênaltis, score.fullTime pode refletir
        // o placar acumulado do shootout em vez do placar do tempo normal/prorrogação.
        // Preservamos o placar já salvo (set durante o jogo) e apenas finalizamos
        // o registro com advancer correto. Se home_score ainda for null (nunca
        // atualizado ao vivo), o admin deverá lançar o placar manualmente.
        if (m.score.duration !== 'PENALTY_SHOOTOUT') {
          let home = m.score.fullTime.home as number
          let away = m.score.fullTime.away as number
          if (swapped) { [home, away] = [away, home] }
          patch.home_score = home
          patch.away_score = away
        }

        patch.advancer = advancer
        patch.finished = true
        patch.result_source = 'api'
        result.placaresAtualizados++
      }
    }

    const { error: upErr } = await supabase.from('matches').update(patch).eq('id', target.id)
    if (upErr) throw new SyncError('Falha ao atualizar jogo.', 500, { detail: upErr.message, matchId: target.id })
  }

  result.idaVoltaLinkados = await linkTiesForTorneio(supabase, torneio)

  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) return json({ error: 'FOOTBALL_DATA_TOKEN não configurado.' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  if (!(await isAuthorized(req, supabaseUrl))) return json({ error: 'Não autorizado.' }, 401)

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: torneiosData, error: torneiosErr } = await supabase
    .from('torneios')
    .select('id, nome, slug, competition_code, data_source')
    .eq('is_active', true)
    .eq('data_source', 'football-data.org')
  if (torneiosErr) return json({ error: 'Falha ao ler torneios.', detail: torneiosErr.message }, 500)

  const torneiosAtivos = (torneiosData ?? []) as Torneio[]
  if (torneiosAtivos.length === 0) {
    return json({ ok: true, skipped: true, reason: 'Nenhum torneio ativo com fonte football-data.org.' })
  }

  const porTorneio: Record<string, unknown> = {}
  let houveErro = false

  for (const torneio of torneiosAtivos) {
    try {
      const result = await syncTorneio(supabase, torneio, token)
      porTorneio[torneio.slug] = result
      await supabase.from('sync_logs').insert({ function_name: 'sync-resultados', status: 'ok', summary: result })
    } catch (e) {
      houveErro = true
      const status = e instanceof SyncError ? e.status : 500
      const detail = e instanceof SyncError ? e.detail : String(e)
      const message = e instanceof Error ? e.message : 'Erro inesperado.'
      porTorneio[torneio.slug] = { error: message, detail, status }
      await supabase
        .from('sync_logs')
        .insert({ function_name: 'sync-resultados', status: 'error', summary: { torneio: torneio.slug, error: message, detail } })
    }
  }

  return json({ ok: !houveErro, porTorneio }, houveErro ? 207 : 200)
})
