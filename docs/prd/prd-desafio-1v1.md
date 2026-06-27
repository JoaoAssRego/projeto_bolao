# PRD — Desafio 1v1

**Status:** Pronto para desenvolvimento  
**Prioridade:** Média (Copa 2026 em andamento, feature mais complexa)  
**Esforço estimado:** 3 dias  
**Referência no documento de engajamento:** Seção 4.1 — Loops Sociais Recíprocos e Espacialidade

---

## Objetivo

Permitir que qualquer participante desafie outro para uma competição paralela de palpites. O desafiado deve aceitar explicitamente. O desafio tem escopo configurável (um jogo, uma rodada ou a Copa inteira) e resolve-se automaticamente ao final do período, com resultado compartilhável no WhatsApp.

---

## Contexto

O documento de engajamento (seção 4.1) descreve o "Loop Social Recíproco": o gatilho de um desafio direto força o rival a responder — ignorar o desafio é percebido como fraqueza. Esse mecanismo de reciprocidade é o motor mais eficiente para reativar participantes que pararam de abrir o app. Um desafio pendente no nome do usuário é uma razão concreta para voltar.

---

## User Stories

**US-01 — Criar desafio**  
Como participante, quero desafiar um colega específico escolhendo o escopo (jogo, rodada ou Copa), para criar uma rivalidade direta com aposta simbólica.

**US-02 — Receber e aceitar desafio**  
Como participante desafiado, quero ser notificado dentro do app e poder aceitar ou recusar com um toque, para decidir se quero entrar na disputa.

**US-03 — Acompanhar desafio ativo**  
Como participante em um desafio ativo, quero ver um card na minha Home mostrando minha posição versus meu rival dentro do escopo do desafio, para saber se estou ganhando ou perdendo.

**US-04 — Ver resultado final**  
Como participante em um desafio encerrado, quero ver quem ganhou e poder compartilhar o resultado no WhatsApp, para reivindicar publicamente a vitória (ou admitir a derrota com humor).

**US-05 — Aposta simbólica**  
Como criador do desafio, quero adicionar uma descrição textual de aposta simbólica (ex: "perdedor paga o almoço"), para dar peso emocional ao desafio sem envolver dinheiro real.

---

## Comportamento Detalhado

### Fluxo Completo

```
Usuário A → abre modal "Criar Desafio"
    → Escolhe oponente (lista de participantes)
    → Escolhe escopo: Jogo / Rodada / Copa inteira
    → (opcional) Escreve aposta simbólica
    → Confirma → Desafio criado com status "pending"

Usuário B → vê badge de notificação na aba de Desafios
    → Abre card do desafio pendente
    → Aceita → status muda para "active"
    → Recusa → status muda para "declined", Usuário A é notificado

[Desafio ativo]
    → Ambos veem mini-card na Home com placar atual do duelo
    → Pontos calculados conforme regras normais, filtrados pelo escopo

[Escopo encerrado]
    → Status muda para "completed" automaticamente
    → Card de resultado exibido para ambos
    → Botão "Compartilhar no WhatsApp" disponível
```

---

### Escopos do Desafio

| Escopo | Descrição | Resolução automática |
|--------|-----------|----------------------|
| **Jogo** | Um único jogo específico | Quando `match.finished = true` para o jogo selecionado |
| **Rodada** | Todos os jogos do mesmo dia | Quando todos os jogos do dia tiverem `finished = true` |
| **Copa inteira** | Todos os jogos do torneio | Quando a final tiver `finished = true` |

---

### Tela de Desafios

Uma nova seção acessível pela tela de **Ligas** (nova aba "Desafios" dentro de `Ligas.tsx`) ou como item no menu de navegação, dependendo do espaço disponível. Contém:

- **Pendentes:** Desafios aguardando ação do usuário (aceitar/recusar)
- **Ativos:** Desafios em andamento com placar ao vivo
- **Encerrados:** Histórico de desafios resolvidos

### Mini-card na Home

Quando houver desafio ativo, um card compacto aparece na Home (abaixo do ranking geral, acima dos jogos do dia) com:

```
┌────────────────────────────────┐
│  ⚔️  Duelo com Carlos          │
│  Rodada de hoje                │
│                                │
│  Você: 10pts  ·  Carlos: 5pts  │
│  📈 Você está na frente        │
│                     [Ver →]    │
└────────────────────────────────┘
```

### Aposta Simbólica

Campo de texto livre, máximo 60 caracteres. Exibido no card do desafio e no card de resultado. Exemplos sugeridos na interface:
- "Perdedor paga o café"
- "Perdedor posta foto envergonhada no grupo"
- "Perdedor faz silêncio por uma semana"

---

### Notificações In-App

O sistema de notificações in-app é simples: um contador de badge na aba/seção de Desafios indicando ações pendentes.

| Evento | Notificação para quem |
|--------|----------------------|
| Desafio criado | Usuário desafiado vê badge na aba Desafios |
| Desafio aceito | Usuário desafiante vê badge |
| Desafio recusado | Usuário desafiante vê badge |
| Desafio encerrado | Ambos veem badge |

Notificações são lidas via polling do store ao abrir o app (não requer WebSocket).

---

## Schema SQL

### Nova tabela: `challenges`

```sql
create table challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid references participants(id) not null,
  challenged_id uuid references participants(id) not null,
  scope_type text not null check (scope_type in ('match', 'round', 'tournament')),
  scope_match_id uuid references matches(id),   -- preenchido se scope_type = 'match'
  scope_round_date date,                         -- preenchido se scope_type = 'round'
  wager_text text,                               -- aposta simbólica (opcional)
  status text not null default 'pending'
    check (status in ('pending', 'active', 'declined', 'completed')),
  winner_id uuid references participants(id),    -- preenchido ao resolver
  created_at timestamptz default now(),
  resolved_at timestamptz
);
```

### RLS (Row Level Security)

- Qualquer participante autenticado pode criar um desafio
- Participante só vê desafios onde `challenger_id = auth.uid()` ou `challenged_id = auth.uid()`
- Apenas o `challenged_id` pode atualizar status de `pending` para `active` ou `declined`
- Status `completed` e `winner_id` são atualizados via função do servidor ou trigger

---

## Impacto nos Componentes Existentes

| Arquivo | Alteração |
|---------|-----------|
| `src/screens/Ligas.tsx` | Adicionar aba "Desafios" com lista de pending/active/completed |
| `src/screens/Home.tsx` | Adicionar mini-card de duelo ativo (se houver) |
| `src/components/ChallengeCard.tsx` | **Novo** — card de desafio (pendente, ativo ou encerrado) |
| `src/components/ChallengeCreateModal.tsx` | **Novo** — modal de criação com seleção de oponente + escopo + aposta |
| `src/components/ChallengeResultCard.tsx` | **Novo** — card de resultado com botão compartilhar WhatsApp |
| `src/data/store.tsx` | Adicionar CRUD de `challenges` ao contexto global |
| `src/lib/types.ts` | Adicionar interface `Challenge` |
| `src/lib/scoring.ts` | Adicionar função `computeChallengeScore(challengeId, participants, predictions, matches)` |
| `supabase/migrations/0005_challenges.sql` | **Novo** — migration com tabela e RLS |

---

## Critérios de Aceite

**Criação:**
- [ ] Modal de criação exibe lista de participantes (exceto o próprio usuário)
- [ ] Usuário pode selecionar escopo: Jogo / Rodada / Copa
- [ ] Para escopo "Jogo": exibe lista de jogos futuros para seleção
- [ ] Para escopo "Rodada": exibe datas disponíveis
- [ ] Campo de aposta simbólica é opcional (máximo 60 caracteres)
- [ ] Desafio é salvo no Supabase com status `pending`

**Notificação e aceite:**
- [ ] Usuário desafiado vê badge numérico na aba/seção Desafios
- [ ] Card de desafio pendente exibe: nome do desafiante, escopo, aposta simbólica (se houver)
- [ ] Botão Aceitar muda status para `active`
- [ ] Botão Recusar muda status para `declined`
- [ ] Após aceite, desafiante vê o desafio na lista de Ativos

**Acompanhamento:**
- [ ] Mini-card na Home mostra placar ao vivo do duelo ativo
- [ ] Placar calculado corretamente conforme escopo (apenas pontos dos jogos do escopo)
- [ ] Tela de Desafios mostra placar detalhado do duelo ativo

**Resolução:**
- [ ] Desafio muda para `completed` automaticamente quando escopo encerra
- [ ] `winner_id` é preenchido corretamente (empate: sem winner)
- [ ] Card de resultado exibido para ambos os participantes
- [ ] Botão "Compartilhar no WhatsApp" gera card visual com resultado do duelo
- [ ] Empate é tratado corretamente (exibe "Empate — nenhum dos dois acertou mais")

**Segurança:**
- [ ] RLS impede que usuário veja desafios de terceiros
- [ ] Usuário não pode aceitar/recusar desafio do qual não é o desafiado
