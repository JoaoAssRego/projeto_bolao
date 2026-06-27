export type CardTone = 'neutro' | 'provocador' | 'selvagem'
export type CardContext = 'pre' | 'post-exact' | 'post-result' | 'post-zero'

const PHRASES: Record<CardContext, Record<CardTone, string[]>> = {
  pre: {
    neutro: [
      'Meu palpite está feito. E o seu?',
      'Apostei minha honra nisso.',
    ],
    provocador: [
      'Já sei o resultado. Spoiler: vocês vão errar.',
      'Palpite registrado. Prepara o chorinho.',
    ],
    selvagem: [
      'Enquanto vocês ainda estão pensando, eu já fechei. 😂',
      'Vem me tirar do primeiro lugar, se conseguir.',
    ],
  },
  'post-exact': {
    neutro: [
      'Placar exato. 10 pontos na conta.',
    ],
    provocador: [
      'PLACAR EXATO. Alguém mais? Não? Só eu? Ok. 👑',
    ],
    selvagem: [
      '10 pontos. Absolutamente devastador. Podem chorar.',
    ],
  },
  'post-result': {
    neutro: [
      'Resultado certo. 5 pontos garantidos.',
      'Acertei o resultado. Segue o jogo.',
    ],
    provocador: [
      '5 pontos no bolso. Quem mais acertou? 😏',
      'Acertei o resultado. Pelo menos não errei. 😏',
    ],
    selvagem: [
      '5 pontos no bolso. Tô vivo na briga. 💪',
      'Acertei o resultado. Quero mais? Claro que sim. 😤',
    ],
  },
  'post-zero': {
    neutro: [
      'Dessa vez não. Na próxima rodada.',
      'Zero pontos. Acontece.',
    ],
    provocador: [
      'Errei feio. Mas errei junto com vocês, né? 😅',
      'Dessa vez a bola rodou diferente. 🙃',
    ],
    selvagem: [
      'Zero pontos. Mas pelo menos tentei. 😅',
      'ERREI TUDO. Mas ainda tô no jogo. 😤',
    ],
  },
}

export function getPhrase(context: CardContext, tone: CardTone): string {
  const list = PHRASES[context][tone]
  return list[Math.floor(Math.random() * list.length)]
}

export function contextFromPts(pts: number | null): Exclude<CardContext, 'pre'> {
  if (pts === 10) return 'post-exact'
  if (pts === 5) return 'post-result'
  return 'post-zero'
}
