---
name: sync-resultados-api
description: Bolão da Copa puxa resultados automaticamente da football-data.org via Edge Function + pg_cron (desvio da spec original)
metadata:
  type: project
---

A `ESPECIFICACAO.md` original dizia "resultados lançados manualmente, sem API ao vivo". Em 2026-06-21 o dono (João) pediu para puxar jogos/resultados de uma API gratuita **após o término** de cada jogo. Decisão tomada:

- **API:** football-data.org (free tier, token grátis), competição `WC`, endpoint `/v4/competitions/WC/matches`, auth header `X-Auth-Token`.
- **Onde roda:** Edge Function `supabase/functions/sync-resultados` (Deno), agendada por `pg_cron` a cada 30 min (`supabase/sync_cron.sql`). Token fica como secret `FOOTBALL_DATA_TOKEN`, nunca no frontend.
- **Lançamento manual mantido e com prioridade:** coluna `result_source` em `matches` ('manual'|'api'); o sync nunca sobrescreve um resultado `finished + manual`. `saveResult` no store grava 'manual'.
- **Mata-mata:** placar = `score.fullTime` (sem pênaltis); advancer = `score.winner` (com pênaltis) — alinhado à regra do bolão.
- **Casamento de times:** por nome via mapa PT↔EN em `supabase/functions/sync-resultados/teams.ts`; só preenche jogos com times já definidos. Migração: `supabase/migrations/0002_sync_api.sql`.

**Why:** automatiza o trabalho do admin durante a Copa sem abrir mão da correção manual.
**How to apply:** ao mexer em resultados/scoring, lembre que a fonte pode ser API; preserve a prioridade do manual e a regra de pênaltis.
