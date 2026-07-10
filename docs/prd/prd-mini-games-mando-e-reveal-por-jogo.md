# PRD — Mini Games: mando, local e revelação por jogo

**Status:** Pronto para desenvolvimento
**Prioridade:** Alta (polimento da aba Games recém-lançada)
**Esforço estimado:** 1 dia
**Escopo:** aba **Games** ("Refaça a Glória") — telas de campanha e desafio do dia
**Não depende de backend:** tudo em dados curados + estado local (localStorage), como o resto do Mini Games ([`../../src/lib/minigames`](../../src/lib/minigames))

---

## Objetivo

Tornar cada jogo da campanha uma unidade completa e evidente:

1. **Evidenciar mando** — deixar claro quem foi **mandante** e quem foi **visitante** em cada jogo, para que os confrontos de ida e volta da Libertadores deixem de parecer idênticos.
2. **Mostrar o local** — exibir o estádio/cidade de cada jogo.
3. **Revelação por jogo** — ao dar o palpite, o usuário **já vê na hora** se acertou ou errou aquele jogo (em vez de só no fim da campanha).

## Contexto

Hoje (`src/screens/minigames/Campanha.tsx`) o usuário chuta **todos** os jogos + o artilheiro e só então vê o resultado de tudo de uma vez (`Reveal`). O nosso time aparece **sempre à esquerda**, independente de ter jogado em casa ou fora — então a ida e a volta de um mesmo confronto ficam visualmente idênticas. O local do jogo existe, mas enfiado como texto livre dentro do campo `note` (`"Maracanã — dois gols de Gabigol"`), misturado com narrativa. Isso foi percebido jogando: não há diferença perceptível entre ida e volta.

---

## User Stories

**US-01 — Ver quem foi mandante**
Como jogador, quero ver rotulado quem jogou em casa e quem jogou fora em cada partida, para distinguir a ida da volta de um confronto.

**US-02 — Ver o local do jogo**
Como jogador, quero ver o estádio/cidade de cada partida, para dar contexto histórico ao palpite.

**US-03 — Feedback imediato por jogo**
Como jogador, quero descobrir se acertei o placar assim que confirmo o palpite de cada jogo, para sentir cada partida como um desafio fechado e independente.

---

## Decisões de design (resolvidas em sessão de grilling — 2026-07-10)

### 1. Modelo de dados (`src/lib/minigames/types.ts` + re-curadoria de `campaignsData.ts`)

- Novo campo **`home: 'us' | 'them' | 'neutral'`** em `MgPathMatch`.
  - Copa do Mundo (grupos → final) e **finais únicas** da Libertadores → `neutral`.
  - Confrontos ida/volta da Liberta → mando determinístico (um jogo em casa, outro fora), derivado dos `note` atuais que já trazem estádio/cidade.
- Novo campo **`venue: string`** já formatado para exibição: `"Estádio · Cidade"` quando houver estádio confiável, ou só a cidade quando não houver.
- **`note` passa a ser só narrativa** (ex: `"gol de Danilo no fim"`); o local sai de dentro dele.
- **`score` e `MgGuess` inalterados** — continuam SEMPRE `[gols do nosso time, gols do adversário]` internamente. Só a **apresentação** respeita o mando.
- `sourceConfidence` rebaixado para `medium` em qualquer campanha onde o local de algum jogo tenha sido inferido (sem pesquisa externa). Onde o estádio não for seguro, exibir **só a cidade** — nunca inventar estádio.

### 2. Apresentação (`src/components/minigames/bits.tsx` — `ConfrontoScore`)

- **Ordem mandante-esquerda × visitante-direita.** Em jogo fora, o nosso time vai para a **direita** (o display inverte; o placar interno segue `[nós, eles]`). Em `neutral`, o nosso time fica à esquerda (fallback).
- **Rótulos textuais "Mandante" / "Visitante"** sob cada escudo. Em `neutral`, um único selo central **`🏟️ Sede neutra`** e nenhum rótulo de mando.
- **Linha de local** com `📍 Estádio · Cidade`.
- A orientação mandante-esquerda vale em **TODAS** as exibições de placar de um jogo: tela de chute, revelação inline, resumo final e `DailyDone` do desafio do dia. (O placar interno nunca muda; só a apresentação.)

### 3. Fluxo da campanha (`src/screens/minigames/Campanha.tsx`)

- Cada jogo: **confirmar palpite → revela inline** (placar real + o seu, lado a lado, + badge 10/7/5/0) **→ trava → avançar**.
- Após revelar, o placar daquele jogo é **imutável** (some o "Confirmar", vira "Próximo jogo" / "Ir para o artilheiro"). Elimina a possibilidade de corrigir depois de ver a resposta.
- O **artilheiro** segue a mesma regra: confirma → revela na hora → "Ver resultado".
- **Fluxo estritamente para frente:** sem voltar entre jogos. A setinha do header **sai da campanha** (`/games`), com **confirmação** ao sair no meio (`"Sair? Você perde o progresso desta campanha."`).
- **Resumo final** vira tela de **celebração**: headline + total `X/max` + compartilhar + ações (jogar de novo / outra campanha). No lugar da lista detalhada jogo-a-jogo, uma **faixa compacta de pontinhos coloridos** (um por jogo, cor pelo badge). Remover a faixa se ficar redundante ao montar.
- **Persistência inalterada:** o agregado (`saveCampaignResult`) é salvo só no fim, depois do artilheiro. Sem retomada de campanha pela metade — sair no meio não grava nada (igual hoje). O reveal-and-lock vive só no estado local do React durante a sessão.

### 4. Desafio do dia (`src/screens/MiniGames.tsx`)

- Herda mando/local/orientação via o mesmo `ConfrontoScore`. O fluxo já revela na hora (`DailyDone`); nenhuma mudança de fluxo, só a apresentação nova.

---

## Fora de escopo

- Leaderboard compartilhado / backend (continua sendo o fast-follow já planejado).
- Retomada de campanha abandonada pela metade.
- Reordenação do input do DrumPicker além da inversão visual mandante×visitante.
- Pesquisa externa para enriquecer dados históricos (curadoria usa `note` + conhecimento consolidado, offline).

## Critérios de aceite

- [ ] Ida e volta de um mesmo confronto da Liberta são visualmente distintas (mando invertido + rótulos + local).
- [ ] Todo jogo mostra "Mandante"/"Visitante" (ou "Sede neutra") e o local.
- [ ] Ao confirmar o palpite de um jogo, o resultado daquele jogo é revelado imediatamente e o palpite trava.
- [ ] A orientação mandante-esquerda é consistente entre tela de chute, reveal inline, resumo final e desafio do dia.
- [ ] O placar interno e a pontuação (10/7/5/0) permanecem corretos independentemente da inversão de lados.
- [ ] Sair da campanha no meio pede confirmação; concluir salva o agregado como antes.
