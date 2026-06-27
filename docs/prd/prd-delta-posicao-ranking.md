# PRD — Delta de Posição no Ranking

**Status:** Pronto para desenvolvimento  
**Prioridade:** Alta (Copa 2026 em andamento)  
**Esforço estimado:** 0,5 dia  
**Referência no documento de engajamento:** Seção 3.1 — Aprofundamento Progressivo e Feedback Visual

---

## Objetivo

Mostrar visualmente quantas posições cada participante subiu ou desceu no ranking após cada rodada, criando feedback imediato de progressão e regressão que incentiva a consulta frequente ao app — especialmente após os resultados chegarem via API.

---

## Contexto

O ranking atual em `Home.tsx` e `Classificacao.tsx` mostra a posição estática de cada participante. Não há contexto de movimento. Um usuário que abriu o app depois de uma rodada não sabe se melhorou, piorou ou ficou igual. Esse feedback de delta transforma a consulta ao ranking de informacional para emocional.

**Ponto de referência do delta:** comparação com o ranking imediatamente antes da rodada atual (agrupada por dia/fase de jogo).

---

## User Stories

**US-01 — Ver delta após rodada**  
Como participante, após os resultados de uma rodada serem publicados, quero ver setas indicando quantas posições subi ou desci, para sentir o impacto imediato do meu desempenho.

**US-02 — Badge de rodada perfeita**  
Como participante que acertou todos os jogos de uma rodada, quero receber um destaque visual especial no ranking, para ter reconhecimento público perante o grupo.

**US-03 — Estado sem mudança**  
Como participante que não mudou de posição, quero ver uma indicação neutra (—), para confirmar que o ranking foi atualizado e minha posição foi mantida.

---

## Comportamento Detalhado

### Exibição do Delta

Cada linha do ranking exibe, ao lado da posição atual, um indicador de variação:

| Variação | Indicador | Cor |
|---------|-----------|-----|
| Subiu N posições | `↑N` (ex: ↑3) | Verde |
| Desceu N posições | `↓N` (ex: ↓2) | Vermelho |
| Sem mudança | `—` | Cinza neutro |
| Primeira rodada / sem histórico | (sem indicador) | — |

Badge "🔥 Rodada perfeita" aparece ao lado do nome do participante que acertou **todos** os jogos da última rodada (independente de ser placar exato ou apenas resultado).

### Definição de "Rodada"

Uma rodada é definida como o conjunto de jogos com o mesmo `kickoff` de data (dia). Todos os jogos com `kickoff` no mesmo dia UTC-3 (BRT) pertencem à mesma rodada para fins de cálculo de delta.

### Ciclo de vida do snapshot

```
Rodada começa (primeiro kickoff do dia)
    → Snapshot do ranking atual é salvo
    → Delta exibido: "—" para todos (sem mudança ainda)

Resultados chegam via API ao longo do dia
    → Ranking recalculado em tempo real
    → Delta atualizado comparando ranking atual com snapshot salvo

Nova rodada começa (primeiro kickoff do próximo dia)
    → Snapshot anterior é substituído pelo ranking no momento
    → Delta reinicia
```

---

## Estratégia de Persistência do Snapshot

O snapshot do ranking anterior deve ser armazenado em **localStorage**, chaveado pela data da rodada:

```
localStorage key: "ranking_snapshot_YYYY-MM-DD"
value: [{ participantId: string, position: number }]
```

**Lógica de atualização:**
1. Ao abrir o app, verificar se existe snapshot para o dia anterior.
2. Se o dia atual é diferente do dia do snapshot mais recente, salvar o ranking atual como novo snapshot para o dia de hoje.
3. Calcular delta comparando ranking atual com o snapshot do dia anterior.

> Esta abordagem é puramente client-side, sem alteração de schema SQL. O trade-off é que o delta é calculado por dispositivo — dois usuários no mesmo aparelho veriam o mesmo delta. Para o contexto do bolão (cada pessoa usa seu próprio celular), isso é aceitável.

---

## Impacto nos Componentes Existentes

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/scoring.ts` | Adicionar função `computeRankingDelta(current, snapshot)` que retorna um map de `participantId → delta` |
| `src/lib/rankingSnapshot.ts` | **Novo** — funções para salvar/recuperar snapshot do localStorage |
| `src/screens/Home.tsx` | Exibir indicador de delta e badge "Rodada perfeita" na lista de ranking |
| `src/screens/Classificacao.tsx` | Mesmo indicador de delta na tela de classificação detalhada |

Nenhuma alteração de schema SQL necessária.

---

## Critérios de Aceite

- [ ] Seta ↑N em verde aparece para participantes que subiram de posição desde o início da rodada atual
- [ ] Seta ↓N em vermelho aparece para participantes que desceram de posição
- [ ] Traço "—" em cinza aparece para participantes sem mudança de posição
- [ ] Badge "🔥 Rodada perfeita" aparece ao lado do nome de quem acertou todos os jogos do dia
- [ ] Delta é exibido tanto em `Home.tsx` quanto em `Classificacao.tsx`
- [ ] Ao iniciar uma nova rodada (novo dia), o snapshot é atualizado e o delta reinicia
- [ ] Quando não há histórico (primeiros jogos do bolão), nenhum indicador é exibido
- [ ] Delta não quebra o layout em telas estreitas (mobile 375px)
