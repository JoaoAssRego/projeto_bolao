# PRD — Nudge de Fechamento de Janela

**Status:** Pronto para desenvolvimento  
**Prioridade:** Alta (Copa 2026 em andamento)  
**Esforço estimado:** 0,5 dia  
**Referência no documento de engajamento:** Seções 3.2 (Escassez) e 6.2 (Nudge Theory + FOMO)

---

## Objetivo

Exibir um banner de urgência na tela Home quando o usuário abrir o app e houver jogos com palpite pendente cujo kickoff ocorre nas próximas 2 horas. O banner usa prova social ("X pessoas já palpitaram") e escassez temporal para converter a visita passiva em ação imediata.

---

## Contexto

O maior risco de abandono em bolões é o usuário esquecer de palpitar antes do kickoff. A janela fecha silenciosamente e o participante perde pontos sem nem perceber. Ao contrário de notificações push (que exigem permissão e são frequentemente silenciadas), um banner in-app atinge exatamente o usuário que já está no app — o momento de maior receptividade possível.

A teoria do Nudge de Thaler indica que intervenções contextuais não-intrusivas superam notificações genéricas em taxa de conversão, pois preservam a sensação de autonomia enquanto direcionam a ação.

---

## User Stories

**US-01 — Ver banner de urgência**  
Como usuário que abriu o app e tem jogos sem palpite nas próximas 2 horas, quero ver um banner de alerta no topo da Home, para lembrar que preciso palpitar antes que a janela feche.

**US-02 — Navegar direto ao jogo pendente**  
Como usuário vendo o banner, quero clicar nele e ser levado diretamente à tela de Jogos com foco nos jogos sem palpite, para palpitar com o mínimo de fricção possível.

**US-03 — Múltiplos jogos pendentes**  
Como usuário com mais de um jogo sem palpite nas próximas 2 horas, quero ver o banner indicando quantos jogos estão pendentes, para ter clareza da urgência total.

**US-04 — Ausência do banner**  
Como usuário que já palpitou em todos os jogos próximos, não quero ver o banner, para não ser perturbado com alertas irrelevantes.

---

## Comportamento Detalhado

### Lógica de Exibição

O banner é exibido quando **todas** as condições abaixo forem verdadeiras:
1. Existe ao menos um jogo com `kickoff` entre agora e agora + 2 horas
2. O usuário autenticado não tem palpite registrado para esse jogo
3. O jogo ainda não começou (`match.finished = false` e `kickoff > now`)

O banner **não** é exibido quando:
- Todos os jogos próximos já têm palpite registrado
- Não há jogos nas próximas 2 horas
- O usuário não está autenticado

### Copy do Banner

**1 jogo pendente:**
> ⚠️ **Brasil × Argentina fecha em 1h30.** 8 pessoas já palpitaram. [Palpitar agora →]

**2+ jogos pendentes:**
> ⚠️ **2 jogos fecham em breve.** Você ainda não palpitou. [Ver jogos →]

O número de pessoas que já palpitaram é calculado a partir dos dados de palpites no store (quantidade de `predictions` para aquele `match_id`).

### Posicionamento

Banner fixo imediatamente abaixo do header de navegação da Home, acima do ranking. Não sobrepõe conteúdo — empurra o conteúdo para baixo (não é overlay).

### Comportamento do CTA

- **1 jogo pendente:** navega para `/jogos` e faz scroll automático até o MatchCard correspondente
- **2+ jogos pendentes:** navega para `/jogos`, sem scroll específico (todos os pendentes estarão visíveis)

### Descarte do Banner

O banner **não** tem botão de fechar (X). Ele desaparece naturalmente quando:
- O usuário palpita em todos os jogos pendentes
- O kickoff passa (jogo começa)
- O app é reiniciado e não há mais jogos pendentes

> Decisão: não permitir descarte manual evita que o usuário ignore o banner sem palpitar, mantendo a pressão contextual ativa enquanto a janela ainda está aberta.

### Janela de tempo configurável

O threshold padrão é 2 horas. Definir como constante em um arquivo de configuração para facilitar ajuste futuro:

```ts
// src/lib/config.ts
export const NUDGE_WINDOW_HOURS = 2;
```

---

## Impacto nos Componentes Existentes

| Arquivo | Alteração |
|---------|-----------|
| `src/components/UrgencyBanner.tsx` | **Novo** — componente do banner com lógica de exibição |
| `src/screens/Home.tsx` | Adicionar `<UrgencyBanner />` abaixo do header, acima do ranking |
| `src/lib/config.ts` | **Novo** (ou existente) — constante `NUDGE_WINDOW_HOURS` |

O componente usa dados já disponíveis no store (`matches`, `predictions`, usuário autenticado). Nenhuma alteração de schema SQL necessária.

---

## Critérios de Aceite

- [ ] Banner aparece na Home quando há jogo nas próximas 2h sem palpite do usuário logado
- [ ] Banner **não** aparece quando todos os jogos próximos já têm palpite
- [ ] Banner **não** aparece quando não há jogos nas próximas 2h
- [ ] Banner **não** aparece para usuário não autenticado
- [ ] Copy com 1 jogo mostra nome dos times e tempo aproximado para kickoff
- [ ] Copy com 2+ jogos mostra contagem de jogos pendentes
- [ ] Número de pessoas que já palpitaram é exibido e é correto
- [ ] Clicar no banner navega para `/jogos`
- [ ] Com 1 jogo pendente, a tela de Jogos faz scroll até o MatchCard correto
- [ ] Banner desaparece após o usuário registrar palpite no jogo pendente
- [ ] Banner desaparece após o kickoff passar
- [ ] Layout não quebra em mobile 375px com o banner ativo
