---
name: sync-resultados-api
description: Bolão puxa resultados automaticamente da football-data.org via Edge Function + pg_cron (desvio da spec original)
metadata:
  type: project
---

A `ESPECIFICACAO.md` original dizia "resultados lançados manualmente, sem API ao vivo". Em 2026-06-21 o dono (João) pediu para puxar jogos/resultados de uma API gratuita **após o término** de cada jogo. Decisão tomada:

- **API:** football-data.org (free tier, token grátis), competição `WC`, endpoint `/v4/competitions/WC/matches`, auth header `X-Auth-Token`.
- **Onde roda:** Edge Function `supabase/functions/sync-resultados` (Deno), agendada por `pg_cron` a cada 2 min (`supabase/migrations/0013_retire_sync_ao_vivo.sql`). Segredo `CRON_SECRET` no Vault, não mais anon key hardcoded — o cron antigo apontava pra uma URL de projeto errada e nunca funcionou de verdade (achado em 2026-07-05). Token da API fica como secret `FOOTBALL_DATA_TOKEN`, nunca no frontend. Diagnóstico via tabela `sync_logs`.
- **sync-ao-vivo foi removida (2026-07-05):** existiu uma segunda function que atualizava placar PARCIAL durante o jogo a cada minuto, mas o app nunca exibia esse placar parcial (MatchCard só mostra "ao vivo / aguardando placar" até `finished=true`) e ela dependia de `sync-resultados` já ter criado o `external_id` — uma fragilidade sem benefício real. Prorrogação/pênaltis continuam cobertos: `sync-resultados` reconsulta o jogo a cada execução sem prazo máximo, até a API devolver `FINISHED`.
- **Lançamento manual mantido e com prioridade:** coluna `result_source` em `matches` ('manual'|'api'); o sync nunca sobrescreve um resultado `finished + manual`. `saveResult` no store grava 'manual'.
- **Mata-mata:** placar = `score.fullTime` (sem pênaltis); advancer = `score.winner` (com pênaltis) — alinhado à regra do bolão.
- **Importa fixtures (desde 21/jun):** a função NÃO só preenche placar — ela CRIA os jogos que ainda faltam (grupos + mata-mata) com times/horário, vinculando por `external_id`. Só cria jogo não-iniciado (status SCHEDULED/TIMED); jogos já ocorridos ficam de fora. O esqueleto do mata-mata semeado é "encaixado" (claim por fase, ordem cronológica) em vez de duplicado.
- **Casamento de times:** por nome via mapa PT↔EN inline em `supabase/functions/sync-resultados/index.ts` (constantes `TEAMS`/`PT_DISPLAY` + `displayTeam` para nomes em PT). NUNCA inverte orientação mandante/visitante de jogo já com times (corromperia palpites); só ajusta placar conforme a orientação existente (swap interno). Migração: `supabase/migrations/0002_sync_api.sql`.

**Why:** automatiza o trabalho do admin durante a Copa sem abrir mão da correção manual.
**How to apply:** ao mexer em resultados/scoring, lembre que a fonte pode ser API; preserve a prioridade do manual e a regra de pênaltis.
