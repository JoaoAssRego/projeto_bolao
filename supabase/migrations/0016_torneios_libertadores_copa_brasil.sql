-- Fase 2 do multi-torneio: Libertadores + Copa do Brasil via BSD Football API
-- (sports.bzzoiro.com). Ver docs/prd (se existir) e memória do projeto
-- (project_multi_torneio.md) para os achados técnicos que embasam este design.
--
-- Cole este arquivo no Supabase Dashboard > SQL Editor > Run.

-- ── Corrige unicidade cross-provider de external_id ─────────────────────────
-- uniq_matches_external_id (criado em 0002_sync_api.sql) era um índice único
-- GLOBAL, seguro enquanto só existia uma fonte (football-data.org). Com uma
-- segunda fonte (BSD Football API), os ids de evento são gerados de forma
-- independente e podem colidir com ids do football-data.org. Escopar por
-- torneio_id resolve sem perder a garantia de idempotência do sync.
drop index if exists uniq_matches_external_id;

create unique index if not exists uniq_matches_torneio_external_id
  on matches(torneio_id, external_id) where external_id is not null;

-- ── torneios: colunas específicas da BSD Football API ──────────────────────
-- Nullable: só fazem sentido quando data_source = 'bsd-football-api'.
alter table torneios add column if not exists bsd_league_id integer;
alter table torneios add column if not exists bsd_season_id integer;

-- ── Seed: Copa Libertadores 2026 e Copa do Brasil 2026 ──────────────────────
insert into torneios (nome, slug, competition_code, data_source, bsd_league_id, bsd_season_id, is_featured)
values ('Copa Libertadores 2026', 'libertadores-2026', 'LIB', 'bsd-football-api', 32, 96, false)
on conflict (slug) do nothing;

insert into torneios (nome, slug, competition_code, data_source, bsd_league_id, bsd_season_id, is_featured)
values ('Copa do Brasil 2026', 'copa-do-brasil-2026', 'CDB', 'bsd-football-api', 35, 78, false)
on conflict (slug) do nothing;

-- ── Cron: sync-resultados-bsd a cada 2 minutos ──────────────────────────────
-- Mesmo padrão/segredo (cron_secret, criado em 0009_sync_observability_cron.sql)
-- usado por sync-resultados-copa.
select cron.unschedule('sync-resultados-bsd')
where exists (select 1 from cron.job where jobname = 'sync-resultados-bsd');

select cron.schedule(
  'sync-resultados-bsd',
  '*/2 * * * *',
  $$
  select net.http_post(
    url     := 'https://qrxzbvvnjuunuzfvmqee.supabase.co/functions/v1/sync-resultados-bsd',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- Conferir o agendamento:      select * from cron.job;
-- Ver os últimos syncs:        select * from sync_logs order by created_at desc limit 20;
