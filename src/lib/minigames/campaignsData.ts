import type { MgCampaign } from './types'

// ─── Dados curados das campanhas ────────────────────────────────────────────────
// Verificado contra a Wikipédia (EN/PT/ES) + fontes independentes em Jul/2026.
// score é SEMPRE [gols do nosso time, gols do adversário]. Confrontos de dois
// jogos da Libertadores viram duas entradas (ida/volta). Finais de jogo único
// têm leg=null.
//
// `home` define o mando (e a ORDEM de exibição — mandante à esquerda), sem mexer
// no score: 'us' = nosso time em casa, 'them' = nós fora, 'neutral' = sede neutra
// (Copa do Mundo e finais únicas). `venue` é o local já formatado p/ exibição
// ("Estádio · Cidade" ou só a cidade quando o estádio não é seguro). `note` é só
// narrativa (o local saiu dele). `penalties` só quando o confronto foi nos pênaltis.
//
// Para crescer o catálogo: adicione um objeto seguindo o mesmo schema. Nada mais
// no app precisa mudar — telas, desafio do dia e pontuação leem daqui.

export const CAMPAIGNS_DATA: MgCampaign[] = [
  // ─── Seleção Brasileira — Copas do Mundo (sempre sede neutra) ──────────────────
  {
    id: 'brasil-1958',
    competition: 'copa-do-mundo',
    team: 'Brasil',
    teamKind: 'selecao',
    teamCountryCode: 'br',
    year: 1958,
    topScorer: { name: 'Pelé', goals: 6 },
    scorerOptions: ['Vavá', 'Pelé', 'Zagallo', 'Nílton Santos'],
    sourceConfidence: 'high',
    path: [
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Áustria', opponentCountryCode: 'at', home: 'neutral', venue: 'Ullevi · Gotemburgo', score: [3, 0], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Inglaterra', opponentCountryCode: 'gb', home: 'neutral', venue: 'Ullevi · Gotemburgo', score: [0, 0], penalties: null, note: 'Primeiro 0 a 0 da história das Copas' },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'União Soviética', opponentCountryCode: 'ru', home: 'neutral', venue: 'Ullevi · Gotemburgo', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: null, opponent: 'País de Gales', opponentCountryCode: 'gb', home: 'neutral', venue: 'Ullevi · Gotemburgo', score: [1, 0], penalties: null, note: 'Primeiro gol de Pelé em Copas' },
      { stage: 'sf', stageLabel: 'Semifinal', leg: null, opponent: 'França', opponentCountryCode: 'fr', home: 'neutral', venue: 'Råsunda · Solna', score: [5, 2], penalties: null, note: 'Hat-trick de Pelé' },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Suécia', opponentCountryCode: 'se', home: 'neutral', venue: 'Råsunda · Solna', score: [5, 2], penalties: null, note: null },
    ],
  },
  {
    id: 'brasil-1962',
    competition: 'copa-do-mundo',
    team: 'Brasil',
    teamKind: 'selecao',
    teamCountryCode: 'br',
    year: 1962,
    topScorer: { name: 'Garrincha', goals: 4 },
    scorerOptions: ['Vavá', 'Garrincha', 'Amarildo', 'Pelé'],
    sourceConfidence: 'high',
    path: [
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'México', opponentCountryCode: 'mx', home: 'neutral', venue: 'Sausalito · Viña del Mar', score: [2, 0], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Tchecoslováquia', opponentCountryCode: 'cz', home: 'neutral', venue: 'Sausalito · Viña del Mar', score: [0, 0], penalties: null, note: 'Pelé se lesionou nesta partida' },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Espanha', opponentCountryCode: 'es', home: 'neutral', venue: 'Sausalito · Viña del Mar', score: [2, 1], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: null, opponent: 'Inglaterra', opponentCountryCode: 'gb', home: 'neutral', venue: 'Sausalito · Viña del Mar', score: [3, 1], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: null, opponent: 'Chile', opponentCountryCode: 'cl', home: 'neutral', venue: 'Estádio Nacional · Santiago', score: [4, 2], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Tchecoslováquia', opponentCountryCode: 'cz', home: 'neutral', venue: 'Estádio Nacional · Santiago', score: [3, 1], penalties: null, note: null },
    ],
  },
  {
    id: 'brasil-1970',
    competition: 'copa-do-mundo',
    team: 'Brasil',
    teamKind: 'selecao',
    teamCountryCode: 'br',
    year: 1970,
    topScorer: { name: 'Jairzinho', goals: 7 },
    scorerOptions: ['Pelé', 'Jairzinho', 'Rivelino', 'Tostão'],
    sourceConfidence: 'high',
    path: [
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Tchecoslováquia', opponentCountryCode: 'cz', home: 'neutral', venue: 'Jalisco · Guadalajara', score: [4, 1], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Inglaterra', opponentCountryCode: 'gb', home: 'neutral', venue: 'Jalisco · Guadalajara', score: [1, 0], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Romênia', opponentCountryCode: 'ro', home: 'neutral', venue: 'Jalisco · Guadalajara', score: [3, 2], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: null, opponent: 'Peru', opponentCountryCode: 'pe', home: 'neutral', venue: 'Jalisco · Guadalajara', score: [4, 2], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: null, opponent: 'Uruguai', opponentCountryCode: 'uy', home: 'neutral', venue: 'Jalisco · Guadalajara', score: [3, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Itália', opponentCountryCode: 'it', home: 'neutral', venue: 'Azteca · Cidade do México', score: [4, 1], penalties: null, note: 'Gol de Carlos Alberto fechou o 4 a 1' },
    ],
  },
  {
    id: 'brasil-1994',
    competition: 'copa-do-mundo',
    team: 'Brasil',
    teamKind: 'selecao',
    teamCountryCode: 'br',
    year: 1994,
    topScorer: { name: 'Romário', goals: 5 },
    scorerOptions: ['Bebeto', 'Romário', 'Raí', 'Branco'],
    sourceConfidence: 'high',
    path: [
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Rússia', opponentCountryCode: 'ru', home: 'neutral', venue: 'Stanford Stadium · San Francisco', score: [2, 0], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Camarões', opponentCountryCode: 'cm', home: 'neutral', venue: 'Stanford Stadium · San Francisco', score: [3, 0], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Suécia', opponentCountryCode: 'se', home: 'neutral', venue: 'Pontiac Silverdome · Detroit', score: [1, 1], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: null, opponent: 'Estados Unidos', opponentCountryCode: 'us', home: 'neutral', venue: 'Stanford Stadium · San Francisco', score: [1, 0], penalties: null, note: 'Gol de Bebeto' },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: null, opponent: 'Países Baixos', opponentCountryCode: 'nl', home: 'neutral', venue: 'Cotton Bowl · Dallas', score: [3, 2], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: null, opponent: 'Suécia', opponentCountryCode: 'se', home: 'neutral', venue: 'Rose Bowl · Pasadena', score: [1, 0], penalties: null, note: 'Cabeçada de Romário' },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Itália', opponentCountryCode: 'it', home: 'neutral', venue: 'Rose Bowl · Pasadena', score: [0, 0], penalties: [3, 2], note: 'Brasil campeão nos pênaltis' },
    ],
  },
  {
    id: 'brasil-2002',
    competition: 'copa-do-mundo',
    team: 'Brasil',
    teamKind: 'selecao',
    teamCountryCode: 'br',
    year: 2002,
    topScorer: { name: 'Ronaldo', goals: 8 },
    scorerOptions: ['Rivaldo', 'Ronaldo', 'Ronaldinho', 'Roberto Carlos'],
    sourceConfidence: 'high',
    path: [
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Turquia', opponentCountryCode: 'tr', home: 'neutral', venue: 'Ulsan', score: [2, 1], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'China', opponentCountryCode: 'cn', home: 'neutral', venue: 'Seogwipo', score: [4, 0], penalties: null, note: null },
      { stage: 'group', stageLabel: 'Fase de grupos', leg: null, opponent: 'Costa Rica', opponentCountryCode: 'cr', home: 'neutral', venue: 'Suwon', score: [5, 2], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: null, opponent: 'Bélgica', opponentCountryCode: 'be', home: 'neutral', venue: 'Kobe', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: null, opponent: 'Inglaterra', opponentCountryCode: 'gb', home: 'neutral', venue: 'Shizuoka', score: [2, 1], penalties: null, note: 'Gol de falta de Ronaldinho' },
      { stage: 'sf', stageLabel: 'Semifinal', leg: null, opponent: 'Turquia', opponentCountryCode: 'tr', home: 'neutral', venue: 'Saitama', score: [1, 0], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Alemanha', opponentCountryCode: 'de', home: 'neutral', venue: 'Yokohama', score: [2, 0], penalties: null, note: 'Dois gols de Ronaldo' },
    ],
  },

  // ─── Flamengo — Libertadores ───────────────────────────────────────────────────
  {
    id: 'flamengo-lib-1981',
    competition: 'libertadores',
    team: 'Flamengo',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 1981,
    topScorer: { name: 'Zico', goals: 11 },
    scorerOptions: ['Nunes', 'Zico', 'Adílio', 'Lico'],
    sourceConfidence: 'high',
    path: [
      { stage: 'sf', stageLabel: 'Fase semifinal', leg: null, opponent: 'Deportivo Cali', opponentCountryCode: 'co', home: 'them', venue: 'Cali', score: [1, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Fase semifinal', leg: null, opponent: 'Jorge Wilstermann', opponentCountryCode: 'bo', home: 'them', venue: 'Cochabamba', score: [2, 1], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Fase semifinal', leg: null, opponent: 'Deportivo Cali', opponentCountryCode: 'co', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [3, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Fase semifinal', leg: null, opponent: 'Jorge Wilstermann', opponentCountryCode: 'bo', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [4, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: 'ida', opponent: 'Cobreloa', opponentCountryCode: 'cl', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: 'volta', opponent: 'Cobreloa', opponentCountryCode: 'cl', home: 'them', venue: 'Santiago', score: [0, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final (desempate)', leg: null, opponent: 'Cobreloa', opponentCountryCode: 'cl', home: 'neutral', venue: 'Centenário · Montevidéu', score: [2, 0], penalties: null, note: 'Dois gols de Zico' },
    ],
  },
  {
    id: 'flamengo-lib-2019',
    competition: 'libertadores',
    team: 'Flamengo',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 2019,
    topScorer: { name: 'Gabigol', goals: 9 },
    scorerOptions: ['Bruno Henrique', 'Gabigol', 'Arrascaeta', 'Everton Ribeiro'],
    sourceConfidence: 'high',
    path: [
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'ida', opponent: 'Emelec', opponentCountryCode: 'ec', home: 'them', venue: 'Guayaquil', score: [0, 2], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'volta', opponent: 'Emelec', opponentCountryCode: 'ec', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 0], penalties: [4, 3], note: '2 a 2 no agregado; Fla nos pênaltis' },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'ida', opponent: 'Internacional', opponentCountryCode: 'br', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'volta', opponent: 'Internacional', opponentCountryCode: 'br', home: 'them', venue: 'Beira-Rio · Porto Alegre', score: [1, 1], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'ida', opponent: 'Grêmio', opponentCountryCode: 'br', home: 'them', venue: 'Arena do Grêmio · Porto Alegre', score: [1, 1], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'volta', opponent: 'Grêmio', opponentCountryCode: 'br', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [5, 0], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'River Plate', opponentCountryCode: 'ar', home: 'neutral', venue: 'Monumental · Lima', score: [2, 1], penalties: null, note: 'Dois gols de Gabigol no fim' },
    ],
  },
  {
    id: 'flamengo-lib-2022',
    competition: 'libertadores',
    team: 'Flamengo',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 2022,
    topScorer: { name: 'Pedro', goals: 12 },
    scorerOptions: ['Gabigol', 'Pedro', 'Bruno Henrique', 'Arrascaeta'],
    sourceConfidence: 'high',
    path: [
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'ida', opponent: 'Deportes Tolima', opponentCountryCode: 'co', home: 'them', venue: 'Ibagué', score: [1, 0], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'volta', opponent: 'Deportes Tolima', opponentCountryCode: 'co', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [7, 1], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'ida', opponent: 'Corinthians', opponentCountryCode: 'br', home: 'them', venue: 'Neo Química Arena · São Paulo', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'volta', opponent: 'Corinthians', opponentCountryCode: 'br', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [1, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'ida', opponent: 'Vélez Sarsfield', opponentCountryCode: 'ar', home: 'them', venue: 'José Amalfitani · Buenos Aires', score: [4, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'volta', opponent: 'Vélez Sarsfield', opponentCountryCode: 'ar', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Athletico Paranaense', opponentCountryCode: 'br', home: 'neutral', venue: 'Monumental · Guayaquil', score: [1, 0], penalties: null, note: 'Gol de Gabigol' },
    ],
  },
  {
    id: 'flamengo-lib-2025',
    competition: 'libertadores',
    team: 'Flamengo',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 2025,
    topScorer: { name: 'Arrascaeta', goals: 2 },
    scorerOptions: ['Pedro', 'Arrascaeta', 'Bruno Henrique', 'Jorge Carrascal'],
    sourceConfidence: 'medium',
    sourceNote: 'Campanha com gols distribuídos; Arrascaeta e Pedro lideraram com 2 cada',
    path: [
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'ida', opponent: 'Internacional', opponentCountryCode: 'br', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [1, 0], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'volta', opponent: 'Internacional', opponentCountryCode: 'br', home: 'them', venue: 'Beira-Rio · Porto Alegre', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'ida', opponent: 'Estudiantes', opponentCountryCode: 'ar', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 1], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'volta', opponent: 'Estudiantes', opponentCountryCode: 'ar', home: 'them', venue: 'La Plata', score: [0, 1], penalties: [4, 2], note: '2 a 2 no agregado; Fla nos pênaltis' },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'ida', opponent: 'Racing Club', opponentCountryCode: 'ar', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [1, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'volta', opponent: 'Racing Club', opponentCountryCode: 'ar', home: 'them', venue: 'El Cilindro · Avellaneda', score: [0, 0], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Palmeiras', opponentCountryCode: 'br', home: 'neutral', venue: 'Monumental · Lima', score: [1, 0], penalties: null, note: 'Gol de Danilo' },
    ],
  },

  // ─── Botafogo — Libertadores 2024 ─────────────────────────────────────────────
  {
    id: 'botafogo-lib-2024',
    competition: 'libertadores',
    team: 'Botafogo',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 2024,
    topScorer: { name: 'Júnior Santos', goals: 10 },
    scorerOptions: ['Luiz Henrique', 'Júnior Santos', 'Igor Jesus', 'Thiago Almada'],
    sourceConfidence: 'high',
    path: [
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'ida', opponent: 'Palmeiras', opponentCountryCode: 'br', home: 'us', venue: 'Nilton Santos · Rio de Janeiro', score: [2, 1], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'volta', opponent: 'Palmeiras', opponentCountryCode: 'br', home: 'them', venue: 'Allianz Parque · São Paulo', score: [2, 2], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'ida', opponent: 'São Paulo', opponentCountryCode: 'br', home: 'us', venue: 'Nilton Santos · Rio de Janeiro', score: [0, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'volta', opponent: 'São Paulo', opponentCountryCode: 'br', home: 'them', venue: 'Morumbi · São Paulo', score: [1, 1], penalties: [5, 4], note: 'Botafogo nos pênaltis' },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'ida', opponent: 'Peñarol', opponentCountryCode: 'uy', home: 'us', venue: 'Nilton Santos · Rio de Janeiro', score: [5, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'volta', opponent: 'Peñarol', opponentCountryCode: 'uy', home: 'them', venue: 'Campeón del Siglo · Montevidéu', score: [1, 3], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Atlético Mineiro', opponentCountryCode: 'br', home: 'neutral', venue: 'Monumental · Buenos Aires', score: [3, 1], penalties: null, note: null },
    ],
  },

  // ─── Vasco da Gama — Libertadores 1998 ────────────────────────────────────────
  {
    id: 'vasco-lib-1998',
    competition: 'libertadores',
    team: 'Vasco',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 1998,
    topScorer: { name: 'Luizão', goals: 7 },
    scorerOptions: ['Donizete', 'Luizão', 'Pedrinho', 'Juninho Pernambucano'],
    sourceConfidence: 'high',
    path: [
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'ida', opponent: 'River Plate', opponentCountryCode: 'ar', home: 'us', venue: 'São Januário · Rio de Janeiro', score: [1, 0], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'volta', opponent: 'River Plate', opponentCountryCode: 'ar', home: 'them', venue: 'Monumental · Buenos Aires', score: [1, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: 'ida', opponent: 'Barcelona de Guayaquil', opponentCountryCode: 'ec', home: 'us', venue: 'São Januário · Rio de Janeiro', score: [2, 0], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: 'volta', opponent: 'Barcelona de Guayaquil', opponentCountryCode: 'ec', home: 'them', venue: 'Guayaquil', score: [2, 1], penalties: null, note: 'Primeiro título vascaíno' },
    ],
  },

  // ─── Fluminense — Libertadores 2023 ───────────────────────────────────────────
  {
    id: 'fluminense-lib-2023',
    competition: 'libertadores',
    team: 'Fluminense',
    teamKind: 'clube',
    teamCountryCode: 'br',
    year: 2023,
    topScorer: { name: 'Germán Cano', goals: 13 },
    scorerOptions: ['John Kennedy', 'Germán Cano', 'Jhon Arias', 'André'],
    sourceConfidence: 'high',
    path: [
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'ida', opponent: 'Argentinos Juniors', opponentCountryCode: 'ar', home: 'them', venue: 'Diego Maradona · Buenos Aires', score: [1, 1], penalties: null, note: null },
      { stage: 'r16', stageLabel: 'Oitavas de final', leg: 'volta', opponent: 'Argentinos Juniors', opponentCountryCode: 'ar', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'ida', opponent: 'Olimpia', opponentCountryCode: 'py', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 0], penalties: null, note: null },
      { stage: 'qf', stageLabel: 'Quartas de final', leg: 'volta', opponent: 'Olimpia', opponentCountryCode: 'py', home: 'them', venue: 'Assunção', score: [3, 1], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'ida', opponent: 'Internacional', opponentCountryCode: 'br', home: 'us', venue: 'Maracanã · Rio de Janeiro', score: [2, 2], penalties: null, note: null },
      { stage: 'sf', stageLabel: 'Semifinal', leg: 'volta', opponent: 'Internacional', opponentCountryCode: 'br', home: 'them', venue: 'Beira-Rio · Porto Alegre', score: [2, 1], penalties: null, note: null },
      { stage: 'final', stageLabel: 'Final', leg: null, opponent: 'Boca Juniors', opponentCountryCode: 'ar', home: 'neutral', venue: 'Maracanã · Rio de Janeiro', score: [2, 1], penalties: null, note: 'Gol de John Kennedy na prorrogação' },
    ],
  },
]
