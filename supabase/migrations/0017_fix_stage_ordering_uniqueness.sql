-- Corrige outro índice único cross-provider descoberto ao testar o primeiro
-- sync real da Fase 2 (Libertadores/Copa do Brasil): uniq_matches_stage_ordering
-- (supabase/schema.sql:53) é um índice único GLOBAL em matches(stage, ordering),
-- sem torneio_id. Como Libertadores, Copa do Brasil e Champions League
-- compartilham nomes de fase (r16, qf, sf, final), o primeiro jogo de
-- ordering=1 de um torneio colide com o ordering=1 de outro na mesma fase.
-- Mesma classe de problema já corrigida para external_id em
-- 0016_torneios_libertadores_copa_brasil.sql — aqui escopamos por torneio_id
-- também.
--
-- Cole este arquivo no Supabase Dashboard > SQL Editor > Run.

drop index if exists uniq_matches_stage_ordering;

create unique index if not exists uniq_matches_torneio_stage_ordering
  on matches(torneio_id, stage, ordering);
