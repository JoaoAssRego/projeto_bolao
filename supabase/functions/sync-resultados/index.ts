// ============================================================================
// Edge Function: sync-resultados (ARQUIVO ÚNICO — fácil de colar no painel)
// Importa os jogos da Copa do Mundo (football-data.org) e mantém a tabela
// `matches` em dia: CRIA os jogos que ainda vão acontecer (grupos + mata-mata),
// atualiza times/horário e preenche o PLACAR dos jogos encerrados.
// Pensada para rodar via pg_cron (ver supabase/sync_cron.sql).
//
// Deploy (terminal):   supabase functions deploy sync-resultados
// Deploy (painel):     Edge Functions > sync-resultados > Edit > colar > Deploy
// Segredos:            supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
//                      (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm do ambiente)
//
// Princípios:
//  - Só CRIA jogo que ainda NÃO começou (status SCHEDULED/TIMED). Jogos já
//    ocorridos antes de entrarmos na Copa ficam de fora (não dá pra apostar
//    no passado) — alinhado à ESPECIFICACAO.md.
//  - Placar = score.fullTime (tempo normal + prorrogação; pênaltis NÃO contam
//    para o placar). "Quem avançou" = score.winner (considera pênaltis).
//  - NUNCA sobrescreve resultado lançado/corrigido à mão (finished + manual).
//  - NUNCA inverte a ordem mandante/visitante de um jogo que já tem times
//    definidos (isso corromperia palpites já feitos).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ----------------------------------------------------------------------------
// Mapa de seleções: casa o nome que o admin/usuário vê (PT) com o que a API
// devolve (EN). Primeira forma de cada linha é a canônica.
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

function displayTeam(raw: string | null | undefined): string | null {
  if (!raw) return null
  const c = canonicalTeam(raw)
  return (c && PT_DISPLAY[c]) ?? raw
}

function isoCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const c = canonicalTeam(raw)
  return (c && TEAM_ISO[c]) ?? null
}

// ----------------------------------------------------------------------------
// Sync
// ----------------------------------------------------------------------------
const COMPETITION = 'WC'
const API_URL = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) return json({ error: 'FOOTBALL_DATA_TOKEN não configurado.' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente Supabase ausente.' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey)

  let api: { matches: ApiMatch[] }
  try {
    const res = await fetch(API_URL, { headers: { 'X-Auth-Token': token } })
    if (!res.ok) return json({ error: `football-data.org respondeu ${res.status}`, detail: await res.text() }, 502)
    api = await res.json()
  } catch (e) {
    return json({ error: 'Falha ao chamar a API.', detail: String(e) }, 502)
  }

  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, stage, ordering, label, home_team, away_team, kickoff, external_id, result_source, finished')
  if (dbErr) return json({ error: 'Falha ao ler matches.', detail: dbErr.message }, 500)
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
  const result = {
    criados: 0,
    vinculados: 0,
    placaresAtualizados: 0,
    preservadosManuais: 0,
    ignoradosPassados: 0,
    faseDesconhecida: [] as string[],
  }

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

    let target = byExternal.get(m.id)

    if (!target && hasTeams) {
      target = db.find((d) => {
        if (d.external_id != null || d.stage !== stage) return false
        const h = canonicalTeam(d.home_team)
        const a = canonicalTeam(d.away_team)
        if (!h || !a) return false
        return (h === homeC && a === awayC) || (h === awayC && a === homeC)
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
      swapped = canonicalTeam(target.home_team) === awayC && homeC !== awayC
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
        stage,
        ordering,
        label,
        home_team: displayTeam(homeRaw),
        away_team: displayTeam(awayRaw),
        home_team_code: isoCode(homeRaw),
        away_team_code: isoCode(awayRaw),
        kickoff: m.utcDate,
        external_id: m.id,
        result_source: 'api',
      })
      if (insErr) return json({ error: 'Falha ao criar jogo.', detail: insErr.message, apiId: m.id }, 500)
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
      patch.home_team = displayTeam(homeRaw)
      patch.away_team = displayTeam(awayRaw)
    }
    if (hasTeams) {
      patch.home_team_code = isoCode(homeRaw)
      patch.away_team_code = isoCode(awayRaw)
    }
    if (target.external_id == null) result.vinculados++

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
