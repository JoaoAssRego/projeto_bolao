# PRD — Multi-Torneio (Fase 1: Champions League)

**Status:** Pronto para desenvolvimento
**Prioridade:** Alta (base arquitetural para Libertadores e Copa do Brasil na Fase 2)
**Esforço estimado:** 5-7 dias
**Depende de:** nenhuma feature existente é bloqueante; bloqueia a Fase 2 (Libertadores + Copa do Brasil) e exige revisão de `prd-desafio-1v1.md` e `prd-delta-posicao-ranking.md`

---

## Objetivo

Transformar o bolão de "um torneio fechado (Copa do Mundo 2026)" para uma plataforma que suporta **múltiplos torneios de futebol rodando em paralelo**, cada um com seu próprio conjunto de jogos, ranking e ligas. Esta fase entrega a arquitetura completa e valida-a com um segundo torneio real: a **Champions League**, escolhida por já estar disponível gratuitamente na football-data.org (mesma API já integrada) e por exercitar os dois casos estruturais mais complexos — confrontos de ida e volta e fase liga sem grupos — sem precisar de uma segunda integração de API.

Libertadores e Copa do Brasil ficam para a Fase 2, pois exigem uma segunda fonte de dados (football-data.org só cobre essas duas no plano pago).

---

## Contexto

O app hoje modela um único torneio de forma implícita: `matches` não tem noção de "a qual competição pertence", `Stage` é um enum fechado pensado para o formato específico da Copa do Mundo (grupos + mata-mata de jogo único), e `sync-resultados` está hardcoded para `COMPETITION = 'WC'` com um mapa de seleções nacionais. O ranking é global, e "Liga" já é um conceito existente — subgrupo de amigos dentro do bolão — que **não pode ser confundido** com o novo conceito de campeonato de futebol (daqui em diante chamado **Torneio** / `competition` no código).

Champions League introduz dois formatos que o modelo atual não suporta:
1. **Fase liga** (desde 2024/25): 36 times, tabela única, sem divisão em grupos — não é `group` nem mata-mata.
2. **Mata-mata em ida e volta** (playoffs, oitavas, quartas, semis): dois jogos decidem o confronto por placar agregado — o `Stage` atual assume que um jogo único decide quem avança.

---

## Decisões de produto (contexto das perguntas resolvidas)

Estas decisões foram tomadas em sessão de revisão e **não estão em aberto** — estão aqui para não se perderem na implementação:

- **Torneios concorrentes, não substituição.** Copa do Mundo e Champions League coexistem; o app não "troca" de torneio quando um termina.
- **Nomenclatura.** "Torneio" (PT) / `competition` (código) é o campeonato de futebol. "Liga" continua sendo exclusivamente o subgrupo de amigos.
- **Ranking separado por torneio.** Sem placar agregado entre torneios nesta fase.
- **Liga escopada a um torneio.** `leagues.torneio_id` é obrigatório; uma liga vale só pra um torneio. Criar uma liga pra Champions é um registro diferente de criar uma liga pra Copa do Mundo, mesmo com os mesmos membros.
- **Pontuação de ida/volta.** Cada perna é um jogo independente, pontuado pela regra de mata-mata de sempre (10/7/5/0), com o bônus de 5 pts avaliado sobre o **vencedor daquela partida específica** — não sobre o agregado da série. O agregado é só informativo na UI.
- **Fase liga da Champions.** Novo `Stage` (`league_phase`), reaproveitando a regra de pontuação do `group` (5 pts por acertar o resultado, sem bônus de avanço).
- **Fonte de dados.** football-data.org, mesma API já usada — sem integração nova nesta fase.
- **Navegação.** Seletor de torneio persistente no topo do app, válido para Home, Jogos, Ranking (Classificacao) e Meus Palpites.
- **Torneio padrão.** Último torneio visualizado pelo participante (persistido); na primeira visita, cai no torneio marcado como "destaque" pelo admin.
- **Push.** Sem opt-in por torneio nesta fase — o opt-in único existente passa a escanear pendências em todos os torneios.
- **Migração.** Aditiva (`torneio_id` com backfill), roda em produção sem janela especial de manutenção.
- **Cadastro de torneio.** Sem tela de admin nesta fase — o admin insere o registro do torneio via SQL/migration quando necessário (evento raro).

---

## User Stories

**US-01 — Selecionar torneio**
Como participante, quero escolher entre "Copa do Mundo" e "Champions League" num seletor fixo no topo do app, para ver os jogos, ranking e ligas daquele torneio específico.

**US-02 — Continuar de onde parei**
Como participante que já escolheu um torneio antes, quero que o app abra automaticamente nesse mesmo torneio na próxima visita, sem precisar reselecionar.

**US-03 — Palpitar em jogos de ida e volta**
Como participante, quero palpitar o placar de cada perna (ida e volta) de um confronto de mata-mata da Champions como jogos independentes, e ver minha pontuação de cada um normalmente.

**US-04 — Ver quem avançou de fase**
Como participante, depois que os dois jogos de um confronto de ida/volta terminam, quero ver o placar agregado e quem avançou, mesmo que isso não afete minha pontuação.

**US-05 — Palpitar na fase liga**
Como participante, quero palpitar os jogos da fase liga da Champions (sem grupos, tabela única) exatamente como palpito na fase de grupos da Copa — mesma mecânica, rótulo diferente.

**US-06 — Criar liga para um torneio específico**
Como participante, ao criar uma liga (subgrupo de amigos), quero escolher para qual torneio ela vale, para competir com esse grupo especificamente na Champions, na Copa, ou em ambos (criando duas ligas).

**US-07 — Ranking isolado por torneio**
Como participante, quero que o ranking (global e por liga) mostre só os pontos do torneio que estou vendo, sem misturar com pontos de outro torneio.

---

## Modelo de Dados

### Nova tabela: `torneios`

```sql
create table torneios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                          -- "Copa do Mundo 2026", "Champions League 2026/27"
  slug text not null unique,                    -- "copa-2026", "champions-2026-27" (usado em URL/estado)
  competition_code text not null,               -- código na football-data.org: "WC", "CL"
  data_source text not null default 'football-data.org',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active bool not null default true,         -- torneios encerrados somem do seletor por padrão
  is_featured bool not null default false,      -- torneio padrão pra quem nunca escolheu antes
  created_at timestamptz not null default now()
);
```

### Alterações em `matches`

```sql
alter table matches add column torneio_id uuid references torneios(id);
alter table matches add column tie_id uuid;      -- agrupa ida/volta do mesmo confronto (null se jogo único)
alter table matches add column leg text          -- 'ida' | 'volta' | null
  check (leg in ('ida', 'volta') or leg is null);

-- reaproveita a coluna `label` (hoje usada pra "Grupo A") também pra exibir "Ida"/"Volta"
-- quando leg is not null, a UI prioriza `leg` sobre `label` na renderização.
```

`Stage` (em `src/lib/types.ts`) ganha um novo valor:

```ts
export type Stage = 'group' | 'league_phase' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
```

`league_phase` entra no mesmo tratamento de `group` em `scoring.ts` e em `isKnockout()` (retorna `false` para `league_phase`, assim como já retorna `false` para `group`).

### Alterações em `leagues`

```sql
alter table leagues add column torneio_id uuid references torneios(id) not null default '<id da Copa do Mundo 2026>';
-- depois do backfill, remove o default e mantém not null
```

### Backfill (migration única, `0015_torneios.sql`)

1. Insere o registro `torneios` para a Copa do Mundo 2026 (`competition_code = 'WC'`, `is_featured = true`).
2. Insere o registro `torneios` para a Champions League (`competition_code = 'CL'`, `is_featured = false`, `starts_at`/`ends_at` da temporada 2026/27).
3. `update matches set torneio_id = '<id Copa 2026>' where torneio_id is null`.
4. `update leagues set torneio_id = '<id Copa 2026>' where torneio_id is null`.
5. Torna `matches.torneio_id` e `leagues.torneio_id` `not null` depois do backfill.

Migration é aditiva e não bloqueia escrita — pode rodar com o app em produção e jogos em andamento.

---

## Comportamento Detalhado

### Seletor de torneio

Componente novo (`src/components/TorneioSelector.tsx`), fixo no topo, abaixo do header, visível em Home, Jogos, Classificacao e MeusPalpites. Lista torneios com `is_active = true`. Persistência da escolha:

- Salva em `localStorage` (`torneio_ativo_id`), lido no bootstrap do `store.tsx`.
- Se não houver valor salvo (primeira visita), usa o torneio com `is_featured = true`.

### Sync de ida/volta

`sync-resultados` precisa:
1. Passar a filtrar por `torneio.competition_code` em vez do `COMPETITION` hardcoded, iterando sobre os torneios ativos com `data_source = 'football-data.org'`.
2. Popular `stage = 'league_phase'` quando a API retornar o estágio correspondente da Champions (confirmar o valor exato do campo `stage` da API antes de codar — verificar contra a resposta real da competição `CL` assim que a temporada 2026/27 publicar o calendário).
3. Popular `tie_id` e `leg` para mata-mata: a API da football-data.org identifica confrontos de ida/volta através do campo `id` de cada perna sendo sequencial e do mesmo par de times — a estratégia é agrupar por (fase, par de times não-ordenado) dentro da mesma competição/temporada e ordenar por `utcDate` para atribuir `leg = 'ida'` à primeira e `leg = 'volta'` à segunda. **Precisa validação contra dados reais da API na implementação** — o comportamento exato do payload para confrontos de ida/volta ainda não foi inspecionado neste PRD.
4. Time mapeamento: a lista `TEAMS`/`PT_DISPLAY`/`TEAM_ISO` atual é de seleções nacionais e não serve para clubes. Times de clube da Champions precisam de um mapeamento novo (nome como a API retorna → nome de exibição PT-BR). Dado que nomes de clubes europeus não têm tradução como seleções (ex.: "Real Madrid" já é "Real Madrid"), o mapeamento pode ser mínimo — normalização de acentos/case, sem dicionário de tradução — mas precisa ser validado contra a lista real de participantes da Champions 2026/27.

### Cálculo de agregado (informativo)

Quando os dois jogos de um `tie_id` estão `finished = true`, a UI (`JogoDetalhes.tsx` e `MatchCard.tsx`) soma os placares das duas pernas e exibe o time com mais gols agregados como "avançou" — sem gravar isso em nenhuma coluna, é um cálculo derivado no frontend. **Fora de escopo desta fase:** regra de gol fora de casa (a UEFA aboliu esse critério de desempate a partir de 2021/22 — confirmar se ainda vale para alguma rodada específica antes de implementar qualquer lógica de desempate por gols fora).

### Ranking e Ligas

- `Classificacao.tsx` e as queries de ranking em `store.tsx` passam a filtrar sempre por `torneio_id` (o do torneio selecionado no seletor).
- Criação de liga (`Ligas.tsx`) ganha um campo obrigatório de seleção de torneio, usando a lista de torneios ativos.
- Convites e aprovação de liga não mudam — o convite já é escopado à liga, que agora é escopada ao torneio.

### Push notifications

`send-lembrete-push` e `send-resultado-push` deixam de assumir a tabela `matches` inteira como "a Copa" e passam a escanear jogos de todos os torneios `is_active = true`, sem filtro adicional — mantém o opt-in único existente.

---

## Impacto nos Componentes Existentes

| Arquivo | Alteração |
|---|---|
| `supabase/migrations/0015_torneios.sql` | **Novo** — tabela `torneios`, colunas `torneio_id`/`tie_id`/`leg`, backfill |
| `src/lib/types.ts` | Novo `Stage = 'league_phase'`; nova interface `Torneio`; `Match` ganha `torneio_id`, `tie_id`, `leg`; `League` ganha `torneio_id` |
| `src/lib/scoring.ts` | `league_phase` tratado igual a `group` na função `scoreFor` |
| `supabase/functions/_shared/scoring.ts` | Mesmo ajuste, versão Deno |
| `supabase/functions/sync-resultados/index.ts` | Iterar por torneio ativo em vez de `COMPETITION` fixo; popular `stage: 'league_phase'`; popular `tie_id`/`leg`; novo mapeamento de times de clube |
| `src/components/TorneioSelector.tsx` | **Novo** — seletor persistente no topo |
| `src/data/store.tsx` | Estado de torneio ativo (leitura/escrita em localStorage); todas as queries de `matches`/`leagues`/ranking filtradas por `torneio_id` |
| `src/screens/Home.tsx` | Usa torneio ativo do store para ranking e próximos jogos |
| `src/screens/Jogos.tsx` | Usa torneio ativo; exibe rótulo "Ida"/"Volta" quando `leg` não for nulo |
| `src/screens/Classificacao.tsx` | Ranking filtrado por torneio ativo |
| `src/screens/MeusPalpites.tsx` | Histórico filtrado por torneio ativo |
| `src/screens/Ligas.tsx` | Criação de liga exige seleção de torneio; listagem de ligas mostra a qual torneio pertence |
| `src/screens/JogoDetalhes.tsx` | Exibe placar agregado + "avançou" quando ambas as pernas de um `tie_id` estão finalizadas |
| `src/components/MatchCard.tsx` | Exibe rótulo "Ida"/"Volta" reaproveitando `label`/`leg` |
| `src/screens/Admin.tsx` | Nenhuma tela nova de cadastro de torneio nesta fase; gestão de confrontos/resultados passa a operar sobre o torneio selecionado |
| `docs/database/database-doc.md` | Documentar `torneios` e as colunas novas em `matches`/`leagues` |
| `ESPECIFICACAO.md` | Reescrever "Recorte de jogos", "Sistema de ligas" e "Modelo de dados" para refletir multi-torneio |
| `docs/prd/prd-desafio-1v1.md` | Atualizar escopo "Copa inteira" → "torneio inteiro"; desafio precisa ser escopado a um torneio |
| `docs/prd/prd-delta-posicao-ranking.md` | Delta calculado sobre o ranking do torneio ativo, não um ranking global único |

---

## Fora de Escopo (Fase 1)

- Libertadores e Copa do Brasil (Fase 2 — depende de segunda integração de API).
- Tela de admin para cadastro de torneios (SQL manual por agora).
- Opt-in de push por torneio (todos os torneios notificam pelo opt-in único existente).
- Ranking agregado entre torneios.
- Regra de gol fora de casa em ida/volta (não afeta pontuação nesta fase; e a UEFA já não usa esse critério desde 2021/22).
- Play-off de acesso à fase liga (se a competição 2026/27 tiver, entra como `league_phase` também, sem stage próprio) — confirmar necessidade quando o calendário oficial for publicado.

---

## Critérios de Aceite

**Modelo de dados:**
- [ ] Migration `0015_torneios.sql` roda sem erro em produção com dados existentes intactos
- [ ] Todo `match` e `league` existente tem `torneio_id` apontando para "Copa do Mundo 2026" após o backfill
- [ ] `torneios` contém os registros de Copa do Mundo 2026 e Champions League 2026/27

**Seletor e navegação:**
- [ ] Seletor de torneio aparece em Home, Jogos, Classificacao e MeusPalpites
- [ ] Trocar o torneio no seletor atualiza jogos/ranking/ligas em todas essas telas
- [ ] Ao reabrir o app, o torneio selecionado na última visita é restaurado
- [ ] Na primeira visita (sem histórico), abre no torneio com `is_featured = true`

**Sync e dados da Champions:**
- [ ] `sync-resultados` cria e atualiza jogos da Champions League sem quebrar o sync da Copa do Mundo
- [ ] Jogos da fase liga são criados com `stage = 'league_phase'`
- [ ] Jogos de mata-mata em ida/volta são criados como duas linhas distintas, com `tie_id` igual e `leg` correto (`ida`/`volta`)
- [ ] Nomes de clubes aparecem corretamente na UI (sem nomes crus da API tipo `FC Bayern München` malformatados)

**Pontuação:**
- [ ] Pontuação de jogo da fase liga usa a regra de `group` (10/7/5/0 sem bônus de avanço)
- [ ] Pontuação de cada perna de ida/volta é calculada isoladamente pela regra de mata-mata de sempre
- [ ] Bônus de 5 pts em ida/volta considera o vencedor daquela perna especificamente, não o agregado

**UI de ida/volta:**
- [ ] Jogos de ida/volta exibem rótulo "Ida" ou "Volta" no lugar de `label`
- [ ] Depois que ambas as pernas terminam, a tela do jogo mostra o placar agregado e quem avançou
- [ ] Esse placar agregado não afeta nenhum ponto de nenhum participante

**Ligas e ranking:**
- [ ] Criar uma liga exige escolher um torneio
- [ ] Ranking (global e por liga) mostra somente os pontos do torneio ativo no seletor
- [ ] Uma liga criada para a Champions não aparece nem interfere no ranking da Copa do Mundo

**Push:**
- [ ] Lembrete de fechamento dispara para jogos pendentes de qualquer torneio ativo, não só da Copa
- [ ] Push de resultado dispara para jogos finalizados de qualquer torneio ativo

**Documentação:**
- [ ] `ESPECIFICACAO.md` atualizado (recorte de jogos, sistema de ligas, modelo de dados)
- [ ] `docs/database/database-doc.md` atualizado com `torneios` e as colunas novas
- [ ] `prd-desafio-1v1.md` e `prd-delta-posicao-ranking.md` atualizados para serem torneio-aware
