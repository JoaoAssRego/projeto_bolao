// Casamento de nomes de seleções entre o que o admin digita (PT, com acento)
// e o que a API football-data.org devolve (EN). Cada linha é uma seleção:
// a primeira forma é a canônica; as demais são apelidos/variações aceitas.
// Tudo é normalizado (minúsculas, sem acento) antes de comparar.

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
]

/** minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalizeTeam(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CANONICAL = new Map<string, string>()
for (const group of TEAMS) {
  const canonical = group[0]
  for (const variant of group) CANONICAL.set(normalizeTeam(variant), canonical)
}

/**
 * Retorna a chave canônica de uma seleção. Se o nome não estiver no mapa,
 * cai no próprio nome normalizado — assim nomes idênticos (ex: admin digitou
 * em inglês) ainda casam, mesmo sem apelido cadastrado.
 */
export function canonicalTeam(raw: string | null | undefined): string | null {
  if (!raw) return null
  const norm = normalizeTeam(raw)
  if (!norm) return null
  return CANONICAL.get(norm) ?? norm
}

// Nome de exibição em português (a API devolve em inglês). Usado ao criar jogos.
const PT_DISPLAY: Record<string, string> = {
  brazil: 'Brasil',
  argentina: 'Argentina',
  france: 'França',
  england: 'Inglaterra',
  spain: 'Espanha',
  portugal: 'Portugal',
  germany: 'Alemanha',
  netherlands: 'Holanda',
  belgium: 'Bélgica',
  croatia: 'Croácia',
  italy: 'Itália',
  uruguay: 'Uruguai',
  colombia: 'Colômbia',
  mexico: 'México',
  'united states': 'Estados Unidos',
  canada: 'Canadá',
  japan: 'Japão',
  'south korea': 'Coreia do Sul',
  australia: 'Austrália',
  morocco: 'Marrocos',
  senegal: 'Senegal',
  ghana: 'Gana',
  nigeria: 'Nigéria',
  cameroon: 'Camarões',
  'ivory coast': 'Costa do Marfim',
  egypt: 'Egito',
  tunisia: 'Tunísia',
  algeria: 'Argélia',
  switzerland: 'Suíça',
  denmark: 'Dinamarca',
  poland: 'Polônia',
  serbia: 'Sérvia',
  austria: 'Áustria',
  ecuador: 'Equador',
  peru: 'Peru',
  chile: 'Chile',
  paraguay: 'Paraguai',
  'saudi arabia': 'Arábia Saudita',
  iran: 'Irã',
  qatar: 'Catar',
  wales: 'País de Gales',
  scotland: 'Escócia',
  norway: 'Noruega',
  sweden: 'Suécia',
  turkey: 'Turquia',
  ukraine: 'Ucrânia',
  'costa rica': 'Costa Rica',
  panama: 'Panamá',
  honduras: 'Honduras',
  jamaica: 'Jamaica',
  'new zealand': 'Nova Zelândia',
  greece: 'Grécia',
  czechia: 'República Tcheca',
  hungary: 'Hungria',
  slovenia: 'Eslovênia',
  slovakia: 'Eslováquia',
  romania: 'Romênia',
  russia: 'Rússia',
  bolivia: 'Bolívia',
  venezuela: 'Venezuela',
  'south africa': 'África do Sul',
  'cape verde': 'Cabo Verde',
  jordan: 'Jordânia',
  uzbekistan: 'Uzbequistão',
  curacao: 'Curaçao',
  haiti: 'Haiti',
}

/** Nome amigável em PT para exibir; cai no nome original se não estiver no mapa. */
export function displayTeam(raw: string | null | undefined): string | null {
  if (!raw) return null
  const c = canonicalTeam(raw)
  return (c && PT_DISPLAY[c]) ?? raw
}
