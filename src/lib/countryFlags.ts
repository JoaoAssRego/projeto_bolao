const SUBDIVISION_FLAGS: Record<string, string> = {
  GBENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  GBSCT: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  GBWLS: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

// Maps normalized team names (PT + EN) → ISO code
const NAME_TO_ISO: Record<string, string> = {
  // América do Sul
  brasil: 'BR', brazil: 'BR',
  argentina: 'AR',
  uruguai: 'UY', uruguay: 'UY',
  colombia: 'CO', colômbia: 'CO',
  equador: 'EC', ecuador: 'EC',
  venezuela: 'VE',
  paraguai: 'PY', paraguay: 'PY',
  peru: 'PE',
  chile: 'CL',
  bolívia: 'BO', bolivia: 'BO',

  // Europa
  espanha: 'ES', spain: 'ES',
  franca: 'FR', france: 'FR', frança: 'FR',
  alemanha: 'DE', germany: 'DE',
  portugal: 'PT',
  inglaterra: 'GBENG', england: 'GBENG',
  italia: 'IT', itália: 'IT', italy: 'IT',
  'paises baixos': 'NL', 'países baixos': 'NL', netherlands: 'NL', holanda: 'NL',
  belgica: 'BE', bélgica: 'BE', belgium: 'BE',
  suica: 'CH', suíça: 'CH', switzerland: 'CH',
  croacia: 'HR', croácia: 'HR', croatia: 'HR',
  austria: 'AT', áustria: 'AT',
  turquia: 'TR', turkey: 'TR', turkiye: 'TR',
  escocia: 'GBSCT', escócia: 'GBSCT', scotland: 'GBSCT',
  hungria: 'HU', hungary: 'HU',
  romenia: 'RO', romênia: 'RO', romania: 'RO',
  eslovaquia: 'SK', eslováquia: 'SK', slovakia: 'SK',
  eslovenia: 'SI', eslovênia: 'SI', slovenia: 'SI',
  albania: 'AL', albânia: 'AL',
  georgia: 'GE', geórgia: 'GE',
  'republica checa': 'CZ', 'república checa': 'CZ', czechia: 'CZ', 'czech republic': 'CZ',
  serbia: 'RS', sérvia: 'RS',
  dinamarca: 'DK', denmark: 'DK',
  noruega: 'NO', norway: 'NO',
  finlandia: 'FI', finlândia: 'FI', finland: 'FI',
  suecia: 'SE', suécia: 'SE', sweden: 'SE',
  polonia: 'PL', polônia: 'PL', poland: 'PL',
  ucrania: 'UA', ucrânia: 'UA', ukraine: 'UA',
  grecia: 'GR', grécia: 'GR', greece: 'GR',
  irlanda: 'IE', ireland: 'IE',
  'pais de gales': 'GBWLS', 'país de gales': 'GBWLS', wales: 'GBWLS',
  islandia: 'IS', islândia: 'IS', iceland: 'IS',
  luxemburgo: 'LU', luxembourg: 'LU',
  kosovo: 'XK',

  // África
  marrocos: 'MA', morocco: 'MA',
  senegal: 'SN',
  egito: 'EG', egypt: 'EG',
  nigeria: 'NG', nigéria: 'NG',
  'costa do marfim': 'CI', 'ivory coast': 'CI', "cote d'ivoire": 'CI',
  gana: 'GH', ghana: 'GH',
  camaroes: 'CM', camarões: 'CM', cameroon: 'CM',
  tunisia: 'TN', tunísia: 'TN',
  mali: 'ML',
  'africa do sul': 'ZA', 'áfrica do sul': 'ZA', 'south africa': 'ZA',
  etiopia: 'ET', etiópia: 'ET', ethiopia: 'ET',
  guine: 'GN', guiné: 'GN', guinea: 'GN',
  'republica democratica do congo': 'CD', 'república democrática do congo': 'CD',
  'dr congo': 'CD', 'congo dr': 'CD', 'democratic republic of congo': 'CD',
  argelia: 'DZ', argélia: 'DZ', algeria: 'DZ',
  'cabo verde': 'CV', 'cape verde': 'CV',
  mocambique: 'MZ', moçambique: 'MZ', mozambique: 'MZ',

  // Ásia
  japao: 'JP', japão: 'JP', japan: 'JP',
  'coreia do sul': 'KR', 'south korea': 'KR', 'korea republic': 'KR',
  'arabia saudita': 'SA', 'arábia saudita': 'SA', 'saudi arabia': 'SA',
  australia: 'AU',
  ira: 'IR', irã: 'IR', iran: 'IR',
  catar: 'QA', qatar: 'QA',
  china: 'CN',
  uzbequistao: 'UZ', uzbequistão: 'UZ', uzbekistan: 'UZ',
  jordania: 'JO', jordânia: 'JO', jordan: 'JO',
  oma: 'OM', omã: 'OM', oman: 'OM',
  kuwait: 'KW',
  iraque: 'IQ', iraq: 'IQ',
  indonesia: 'ID', indonésia: 'ID',
  tailandia: 'TH', tailândia: 'TH', thailand: 'TH',
  'emirados arabes unidos': 'AE', 'emirados árabes unidos': 'AE', 'united arab emirates': 'AE', uae: 'AE',
  bahrein: 'BH', bahrain: 'BH',

  // América do Norte / Central / Caribe
  'estados unidos': 'US', 'united states': 'US', usa: 'US', eua: 'US',
  mexico: 'MX', méxico: 'MX',
  canada: 'CA', canadá: 'CA',
  jamaica: 'JM',
  honduras: 'HN',
  guatemala: 'GT',
  'el salvador': 'SV',
  'costa rica': 'CR',
  panama: 'PA', panamá: 'PA',
  'trinidad e tobago': 'TT', 'trinidad and tobago': 'TT',
  cuba: 'CU',
  haiti: 'HT',
  curacao: 'CW', curaçao: 'CW',

  // Oceania
  'nova zelandia': 'NZ', 'nova zelândia': 'NZ', 'new zealand': 'NZ',
  fiji: 'FJ',
}

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function isoFromName(name: string | null | undefined): string | null {
  if (!name) return null
  return NAME_TO_ISO[normalize(name)] ?? null
}

export function getIsoFromName(name: string | null | undefined): string | null {
  return isoFromName(name)
}

function emojiFromIso(code: string): string | null {
  const upper = code.toUpperCase()
  if (SUBDIVISION_FLAGS[upper]) return SUBDIVISION_FLAGS[upper]
  if (!/^[A-Z]{2}$/.test(upper)) return null
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65,
  )
}

// Accepts an ISO code (from DB) with fallback to team name lookup
export function getFlag(isoCode: string | null | undefined, teamName?: string | null): string | null {
  const code = isoCode ?? isoFromName(teamName)
  if (!code) return null
  return emojiFromIso(code)
}
