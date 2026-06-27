# PRD — Cards de Resultado para Compartilhar no WhatsApp

**Status:** Pronto para desenvolvimento  
**Prioridade:** Alta (Copa 2026 em andamento)  
**Esforço estimado:** 1,5 dias  
**Referência no documento de engajamento:** Seções 4.3 e 6.1

---

## Objetivo

Permitir que o usuário gere e compartilhe um card visual no WhatsApp em dois momentos: antes do jogo (com seu palpite) e após o resultado (com os pontos ganhos). O objetivo é transformar o ato de palpitar em um gatilho de conversa no grupo de WhatsApp, onde a interação social já acontece naturalmente.

---

## Contexto

O grupo já se comunica via WhatsApp. O app hoje não oferece nenhuma ponte entre as duas plataformas. Resultados chegam via API automaticamente — não dependem de ação do admin. O compartilhamento de cards é o mecanismo de menor fricção para injetar o bolão dentro do fluxo de conversa existente do grupo.

---

## User Stories

**US-01 — Card pré-jogo**  
Como usuário que já registrou meu palpite, quero gerar um card com meu palpite antes do jogo começar, para provocar meus amigos no WhatsApp antes do kickoff.

**US-02 — Card pós-resultado**  
Como usuário, após o resultado do jogo ser publicado pela API, quero gerar um card mostrando o resultado final, meus pontos ganhos e minha posição no ranking, para compartilhar no grupo.

**US-03 — Seleção de tom**  
Como usuário ao gerar qualquer card, quero escolher o tom da legenda entre Neutro, Provocador e Selvagem, para adequar ao clima do grupo naquele momento.

---

## Comportamento Detalhado

### Gatilhos de exibição do botão "Compartilhar"

| Situação | Botão visível? | Tipo de card gerado |
|----------|---------------|---------------------|
| Usuário tem palpite registrado + jogo ainda não começou | ✅ | Card pré-jogo |
| Jogo encerrado (`match.finished = true`) + resultado disponível | ✅ | Card pós-resultado |
| Usuário não tem palpite + jogo não começou | ❌ | — |
| Jogo em andamento (após kickoff, antes de `finished`) | ❌ | — |

O botão aparece dentro do `MatchCard.tsx`, abaixo das informações do jogo.

---

### Conteúdo do Card Pré-Jogo

```
┌─────────────────────────────────┐
│  🏆 Bolão Copa 2026             │
│                                 │
│  🇧🇷 Brasil  vs  🇦🇷 Argentina   │
│                                 │
│  Meu palpite:  2 × 1            │
│                                 │
│  [frase gerada pelo tom]        │
│                                 │
│  bolao.app                      │
└─────────────────────────────────┘
```

### Conteúdo do Card Pós-Resultado

```
┌─────────────────────────────────┐
│  🏆 Bolão Copa 2026             │
│                                 │
│  🇧🇷 Brasil  2 × 1  🇦🇷 Argentina│
│                                 │
│  Meu palpite: ✅ 2 × 1  (+10pts)│
│  Posição no ranking: #3         │
│                                 │
│  [frase gerada pelo tom]        │
│                                 │
│  bolao.app                      │
└─────────────────────────────────┘
```

---

### Frases por Tom e Contexto

**Pré-jogo — Neutro:**  
- "Meu palpite está feito. E o seu?"
- "Apostei minha honra nisso."

**Pré-jogo — Provocador:**  
- "Já sei o resultado. Spoiler: vocês vão errar."
- "Palpite registrado. Prepara o chorinho."

**Pré-jogo — Selvagem:**  
- "Enquanto vocês ainda estão pensando, eu já fechei. 😂"
- "Vem me tirar do primeiro lugar, se conseguir."

**Pós-resultado — Acertou placar exato (10pts) — Neutro:**  
- "Placar exato. 10 pontos na conta."

**Pós-resultado — Acertou placar exato (10pts) — Provocador:**  
- "PLACAR EXATO. Alguém mais? Não? Só eu? Ok. 👑"

**Pós-resultado — Acertou placar exato (10pts) — Selvagem:**  
- "10 pontos. Absolutamente devastador. Podem chorar."

**Pós-resultado — Acertou resultado (5pts) — Neutro:**  
- "Resultado certo. 5 pontos garantidos."

**Pós-resultado — Errou (0pts) — Neutro:**  
- "Dessa vez não. Na próxima rodada."

**Pós-resultado — Errou (0pts) — Selvagem:**  
- "Zero pontos. Mas pelo menos tentei. 😅"

> A lista completa de frases deve ser implementada em `src/lib/cardPhrases.ts` cobrindo as combinações: [pré/pós] × [acertou exato / acertou resultado / errou] × [neutro / provocador / selvagem].

---

### Geração da Imagem

- Usar biblioteca `html-to-image` para renderizar um componente React oculto em PNG
- O componente renderizado deve usar os design tokens do app (paleta OKLCH, tipografia existente)
- Resolução alvo: 1080×1080px (quadrado, otimizado para WhatsApp)
- Fundo: gradiente da identidade visual do app

### Compartilhamento

1. **Primário:** `navigator.share({ files: [imageFile] })` — Web Share API nativa (funciona em Android Chrome e iOS Safari)
2. **Fallback:** Se `navigator.share` não suportar arquivos, exibir botão "Baixar imagem" + botão "Copiar legenda"

---

## Impacto nos Componentes Existentes

| Arquivo | Alteração |
|---------|-----------|
| `src/components/MatchCard.tsx` | Adicionar botão "Compartilhar" com lógica de gatilho |
| `src/lib/cardPhrases.ts` | **Novo** — biblioteca de frases por contexto + tom |
| `src/components/ShareCardCanvas.tsx` | **Novo** — componente oculto renderizado para imagem |
| `src/components/ShareModal.tsx` | **Novo** — modal com seletor de tom + preview + botão de compartilhar |

Nenhuma alteração de schema SQL necessária.

---

## Critérios de Aceite

- [ ] Botão "Compartilhar" aparece no `MatchCard` apenas nas situações corretas (tabela de gatilhos acima)
- [ ] Modal de compartilhamento abre com seletor de 3 tons
- [ ] Preview do card atualiza ao trocar o tom
- [ ] Card renderizado contém todas as informações descritas para cada tipo (pré/pós)
- [ ] Compartilhamento via Web Share API funciona em Android Chrome
- [ ] Compartilhamento via Web Share API funciona em iOS Safari
- [ ] Fallback de download funciona quando Share API não suporta arquivos
- [ ] Card gerado em menos de 3 segundos após toque no botão
- [ ] Emojis de bandeiras dos países aparecem corretamente no card (usar `countryFlags.ts` existente)
