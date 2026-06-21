-- ============================================================================
-- Bolão da Copa — migração: sincronismo automático de resultados via API
-- (football-data.org). Cole no Supabase Dashboard > SQL Editor > Run.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- Colunas de apoio ao sync na tabela de jogos.
alter table matches add column if not exists external_id    bigint;
alter table matches add column if not exists result_source  text not null default 'manual';
alter table matches add column if not exists last_synced_at timestamptz;

-- Origem do resultado: 'manual' (admin lançou/corrigiu) ou 'api' (veio do sync).
-- O sync só sobrescreve jogos cujo resultado NÃO foi lançado/corrigido à mão.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_result_source_chk'
  ) then
    alter table matches
      add constraint matches_result_source_chk
      check (result_source in ('manual', 'api'));
  end if;
end $$;

-- Um id externo (football-data.org) aponta para no máximo um jogo nosso.
create unique index if not exists uniq_matches_external_id
  on matches(external_id) where external_id is not null;
