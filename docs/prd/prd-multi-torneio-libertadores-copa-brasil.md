# PRD — Multi-Torneio (Fase 2: Libertadores + Copa do Brasil)

**Status:** Implementado e em produção (2026-07-08/09)
**Prioridade:** Alta (destravada depois de ficar pausada por custo)
**Depende de:** Fase 1 (arquitetura multi-torneio + Champions League) — [prd-multi-torneio-champions-league.md](./prd-multi-torneio-champions-league.md)

---

## Objetivo

Estender o bolão para cobrir **Copa Libertadores** e **Copa do Brasil**, reaproveitando a arquitetura multi-torneio já validada na Fase 1 (Champions League). A Fase 1 deixou essas duas de fora porque a football-data.org — única API já integrada — não oferece nenhuma das duas no plano gratuito.

---

## Contexto: por que ficou pausada e por que foi retomada

A Fase 1 já previa esta fase como "depende de segunda integração de API". Três fontes foram avaliadas e descartadas antes desta implementação:

| Fonte | Motivo do descarte |
|---|---|
| API-Football | Tier gratuito não dá acesso a fixtures da temporada atual nem da anterior (só libera `season` 2022-2024). Confirmado de novo em 2026-07-08 mesmo com a liga corretamente catalogada. |
| Sportmonks | Mais caro, mesmo bloqueio de temporada atual no free tier. |
| TheSportsDB | Cobertura e dados reais de 2026 existem, mas o tier grátis trunca `eventsseason` a ~15 eventos por chamada — inviável para um torneio de 120+ jogos. Premium ($9/mês) resolveria mas é licença non-commercial. |

O usuário encontrou uma quarta fonte, a **BSD Football API** (`https://sports.bzzoiro.com`), e a validamos com um token real antes de escrever qualquer código: cobre a temporada 2026 completa das duas competições, sem truncamento e sem limite de uso. Isso destravou a fase sem custo adicional.

---

## Decisões de produto (herdadas da Fase 1, reafirmadas aqui)

Nenhuma decisão de produto nova foi necessária — a Fase 2 reaproveita 100% das decisões já tomadas na Fase 1:

- Torneios concorrentes (Copa do Mundo + Champions + Libertadores + Copa do Brasil coexistem).
- Ranking separado por torneio; liga escopada a um torneio.
- Ida/volta pontua cada perna isoladamente; bônus de avanço é sobre o vencedor daquela partida, não o agregado.
- Sem tela de admin para cadastro de torneio — inserção manual via migration.
- "Não dá pra apostar no passado": um jogo já decidido antes do torneio entrar no bolão nunca é criado retroativamente.

A única decisão nova desta fase é técnica, não de produto: **qual API usar e como mapear o formato dela para o modelo de dados existente** (detalhado abaixo).

---

## Fonte de dados: BSD Football API

- **Base URL:** `https://sports.bzzoiro.com/api/v2`
- **Auth:** header `Authorization: Token <BSD_API_TOKEN>`
- **IDs da temporada 2026:** Copa Libertadores `league_id=32`/`season_id=96`; Copa do Brasil `league_id=35`/`season_id=78`
- **Endpoint usado:** `GET /events/?league_id=&season_id=&limit=200` (com paginação via `next` se algum dia passar de 200 jogos numa temporada)

### Achados técnicos que moldaram o design (validados ao vivo, não são suposições)

1. **Placar já vem limpo de pênaltis.** `home_score`/`away_score` nunca incluem shootout — `penalty_shootout: {home, away}` é um objeto nullable separado. Não existe (e não usamos) nenhum campo de "vencedor agregado" — `advancer` é sempre derivado da comparação direta de `home_score`/`away_score`, igual à regra já travada na Fase 1 para football-data.org.
2. **Não existe campo de vínculo ida/volta.** Sem `tie_id`/`leg` na API. Derivado no nosso lado por `(stage, par de team_id invertido, kickoff próximo)` — usando `home_team_id`/`away_team_id` (estáveis na BSD) em vez de normalização de nome, mais simples e mais confiável do que a estratégia por nome usada para football-data.org.
3. **`round_number` e `group_name` não são confiáveis para mata-mata**, ao contrário do que o próprio schema OpenAPI da BSD documenta ("null para knockout"). Na prática, `round_number` reaproveita o número da última rodada de grupos/fase anterior, e `group_name` às vezes carrega resíduo do grupo antigo em partidas de mata-mata. **Regra adotada:** `round_name` não-vazio manda; ignora `round_number`/`group_name` quando isso acontece. `round_name` vazio + `group_name` preenchido = fase de grupos.
4. **Fixtures de mata-mata futuro só existem depois que a fase anterior é decidida** — a API não publica o chaveamento inteiro de antemão. O sync roda periodicamente (cron a cada 2 min, mesma cadência do `sync-resultados`) e cria os confrontos conforme eles aparecem.
5. **Formato misto da Copa do Brasil**: as primeiras 4 fases (`Round 1`..`Round 4`) são jogo único; a partir da 5ª fase passam a ser ida/volta. O algoritmo de pareamento genérico (agrupa por fase + par de times, só linka quando acha exatamente 2) lida com isso sem nenhum caso especial — fases de jogo único simplesmente não formam par e ficam com `tie_id`/`leg` nulos.
6. **Bug de validação do filtro `status`:** passar um valor de enum errado (ou até lixo) em `?status=` na URL não gera erro — a API ignora silenciosamente e retorna tudo sem filtrar. Por isso o sync busca a lista inteira por `league_id`/`season_id` e decide finalizado/não pelo campo `status` de cada item, nunca por query param.
7. **`"canceled"` (1 L), não `"cancelled"`** — o schema OpenAPI da BSD documenta a grafia errada. O código usa a grafia real.

---

## Modelo de Dados

### Alterações em `torneios` (migration `0016_torneios_libertadores_copa_brasil.sql`)

```sql
alter table torneios add column bsd_league_id integer;
alter table torneios add column bsd_season_id integer;

insert into torneios (nome, slug, competition_code, data_source, bsd_league_id, bsd_season_id, is_featured)
values ('Copa Libertadores 2026', 'libertadores-2026', 'LIB', 'bsd-football-api', 32, 96, false);

insert into torneios (nome, slug, competition_code, data_source, bsd_league_id, bsd_season_id, is_featured)
values ('Copa do Brasil 2026', 'copa-do-brasil-2026', 'CDB', 'bsd-football-api', 35, 78, false);
```

`data_source = 'bsd-football-api'` é o que faz `sync-resultados-bsd` (e não `sync-resultados`) processar esses dois torneios — o mesmo padrão de despacho por `data_source` já usado na Fase 1.

### Novos `Stage` (`src/lib/types.ts`)

```ts
export type Stage =
  | 'lib_q1' | 'lib_q2' | 'lib_q3'         // Libertadores: 3 rodadas eliminatórias antes da fase de grupos
  | 'group' | 'league_phase'                // reaproveitados da Fase 1
  | 'cdb_f1' | 'cdb_f2' | 'cdb_f3' | 'cdb_f4' | 'cdb_r32'  // Copa do Brasil: fases iniciais de jogo único + round de 32
  | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'         // reaproveitados da Fase 1
```

`isKnockout()` não mudou — qualquer estágio novo já cai automaticamente na regra de mata-mata (bônus por `advancer`), que é o comportamento correto para todas essas fases. Rótulos em PT (`STAGE_LABEL`) para as fases numeradas da Copa do Brasil são um detalhe cosmético (ex: "5ª Fase" para `cdb_r32`), ajustável sem risco.

### Dois bugs de schema pré-existentes descobertos e corrigidos

Nenhum dos dois foi introduzido pela Fase 2 — ambos já existiam desde antes da Fase 1, e só ficaram expostos agora porque Libertadores/Copa do Brasil são a primeira fonte a colidir de fato com dados de outra fonte.

1. **`uniq_matches_external_id`** (`0002_sync_api.sql`) era um índice único **global** em `matches(external_id)`. IDs de evento da BSD e da football-data.org são numerados de forma independente e podem colidir. Corrigido em `0016`: substituído por `uniq_matches_torneio_external_id` em `(torneio_id, external_id)`.
2. **`uniq_matches_stage_ordering`** (`supabase/schema.sql:53`) era um índice único **global** em `matches(stage, ordering)`. Como `r16`/`qf`/`sf`/`final` são usados por Libertadores, Copa do Brasil **e** Champions League, o primeiro jogo de `ordering=1` de um torneio colidia com o `ordering=1` de outro na mesma fase. Corrigido em `0017_fix_stage_ordering_uniqueness.sql`: substituído por `uniq_matches_torneio_stage_ordering` em `(torneio_id, stage, ordering)`.

Isso sugere que `supabase/schema.sql` pode ter outras constraints que ainda assumem torneio único — vale revisar por completo antes de adicionar uma quinta competição ou uma terceira fonte de dados.

---

## Comportamento Detalhado

### Edge Function `sync-resultados-bsd`

Arquivo único e autocontido (`supabase/functions/sync-resultados-bsd/index.ts`), espelhando os princípios de `sync-resultados` (nunca sobrescreve resultado manual, nunca inverte mandante/visitante de jogo já populado, grava em `sync_logs`), mas mais simples graças ao formato da BSD:

- **Sem dicionário de tradução de time** — nomes de clube já vêm limpos da API, mesma decisão já tomada para clubes na Fase 1 (times de seleção continuam sendo o único caso com tradução/ISO).
- **Casamento por `team_id`**, não por nome normalizado — mais simples e mais confiável que a estratégia fuzzy usada para football-data.org.
- **Sem fila de "skeleton" pré-criada** — a BSD já publica os confrontos de mata-mata com os times reais definidos assim que o chaveamento sai; nunca existe o caso "time ainda desconhecido".
- **Toda escrita em lote:** a primeira versão fazia um `insert`/`update` por partida (até ~284 round-trips ao Postgres entre os dois torneios) e passava do timeout de execução da Edge Function — a chamada nunca respondia. A versão final monta um array de linhas completas em memória e faz **um único `upsert` por torneio** (mais um para o pareamento de ida/volta). Regra geral fixada por esse bug: **upserts em lote sempre mandam a linha inteira** (todas as colunas NOT NULL) — um upsert parcial (`{id, tie_id, leg}`) quebra com violação de NOT NULL, porque `INSERT ... ON CONFLICT DO UPDATE` valida a linha candidata de insert antes de resolver o conflito, mesmo quando o destino real é um update.
- Cron `sync-resultados-bsd` a cada 2 minutos, mesmo secret (`cron_secret`) e mesmo mecanismo de autorização (`x-cron-secret` ou admin via `current_is_admin()`) já usados por `sync-resultados`.

### Frontend

Nenhuma mudança estrutural. `TorneioSelector`, `store.tsx` e as telas já filtram por `torneio_id` de forma transparente desde a Fase 1 — as duas novas linhas em `torneios` bastaram para elas aparecerem no seletor e nas telas de Jogos/Ranking/Meus Palpites.

---

## Impacto nos Componentes Existentes

| Arquivo | Alteração |
|---|---|
| `supabase/migrations/0016_torneios_libertadores_copa_brasil.sql` | **Novo** — torneios, `bsd_league_id`/`bsd_season_id`, fix de `uniq_matches_external_id`, cron `sync-resultados-bsd` |
| `supabase/migrations/0017_fix_stage_ordering_uniqueness.sql` | **Novo** — fix de `uniq_matches_stage_ordering` (bug pré-existente exposto por esta fase) |
| `src/lib/types.ts` | Novos `Stage` (`lib_q1..3`, `cdb_f1..4`, `cdb_r32`) + `STAGE_LABEL`/`STAGE_ORDER` |
| `supabase/functions/sync-resultados-bsd/index.ts` | **Novo** — sync da BSD Football API para Libertadores e Copa do Brasil |
| `docs/database/database-doc.md` | Documentadas as colunas novas de `torneios`, as duas constraints corrigidas em `matches`, e a tabela `sync_logs` (que já existia desde a Fase 1 mas nunca tinha sido documentada) |

Nenhum arquivo de frontend precisou mudar — validação concreta de que o desenho multi-torneio da Fase 1 é de fato extensível sem tocar na UI.

---

## Fora de Escopo

- **Rate limits reais / diferença entre planos da BSD API** — não dá pra descobrir só com requisições; depende da documentação que o usuário tem em mãos.
- **Termos de uso da BSD API para caso comercial** (bolão entre amigos) — mesma limitação acima.
- **Significado de `websocket_plus`** — campo aparece nas respostas reais mas não existe no schema OpenAPI da BSD.
- **Jogo cancelado no meio da partida** (caso real observado: `status: "canceled"`, placar parcial registrado) — fica sem `finished=true` para sempre; não há tratamento de "anular palpites" nesta fase.
- **Live score em tempo real via `/ws/live/`** — o app não exibe placar parcial de jogo em andamento (mesma decisão já tomada na Fase 1, que aposentou o `sync-ao-vivo`); o flag `live_websocket` da BSD não é usado.

---

## Critérios de Aceite

**Modelo de dados:**
- [x] Migrations `0016` e `0017` rodam sem erro em produção com dados existentes intactos
- [x] `torneios` contém os registros de Copa Libertadores 2026 e Copa do Brasil 2026 com `bsd_league_id`/`bsd_season_id` corretos

**Sync:**
- [x] `sync-resultados-bsd` roda dentro do timeout da Edge Function (upsert em lote, não por partida)
- [x] Primeira invocação real: `ignoradosPassados: 126` em cada torneio (fases já decididas antes do torneio entrar no bolão, corretamente não recriadas), `idaVoltaLinkados: 16` em cada (8 confrontos de Oitavas de Final pareados corretamente), `faseDesconhecida: []` nos dois (mapeamento de `round_name` cobriu tudo)
- [x] Segunda invocação (idempotência): `criados`/`vinculados` caem a zero para jogos já sincronizados

**Frontend:**
- [x] Seletor de torneio mostra Libertadores e Copa do Brasil
- [x] Trocar para esses torneios exibe os jogos das Oitavas de Final com fase/placar corretos — confirmado visualmente no app pelo usuário
