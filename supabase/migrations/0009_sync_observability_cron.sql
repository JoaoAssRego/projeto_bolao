-- ============================================================================
-- Migração: observabilidade do sync + agendamento correto do cron
--
-- Diagnóstico: o cron do sync-resultados apontava para uma URL de projeto
-- ERRADA (copiada errada em supabase/sync_cron.sql), então nunca funcionou.
-- Como sync-resultados é quem preenche `external_id`, o sync-ao-vivo (que
-- disparava certinho a cada minuto) nunca tinha o que processar. Esta
-- migração corrige a URL, formaliza o agendamento como migration (em vez de
-- script solto pra colar no SQL Editor), troca a anon key hardcoded por um
-- segredo próprio (CRON_SECRET, guardado no Vault) e adiciona uma tabela de
-- logs para servir de heartbeat — se ela parar de crescer, o cron parou.
--
-- Depois de aplicar esta migration:
--   1) Rode no SQL Editor para pegar o valor gerado do segredo:
--        select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret';
--   2) Configure o mesmo valor na Edge Function:
--        supabase secrets set CRON_SECRET=<valor-copiado>
--   3) Re-deploy as duas funções SEM a verificação padrão de JWT (elas agora
--      fazem sua própria checagem: CRON_SECRET ou sessão de admin logado):
--        supabase functions deploy sync-resultados --no-verify-jwt
--        supabase functions deploy sync-ao-vivo --no-verify-jwt
-- ============================================================================

-- 1) Tabela de logs de execução (heartbeat + histórico de erros)
create table if not exists sync_logs (
  id bigint generated always as identity primary key,
  function_name text not null,
  status text not null check (status in ('ok', 'skipped', 'error')),
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sync_logs_function_created_idx
  on sync_logs (function_name, created_at desc);

alter table sync_logs enable row level security;
-- Sem policies de propósito: só service_role (Edge Functions) e acesso direto
-- via SQL Editor conseguem ler/escrever. Nenhum client anon/autenticado vê isso.

-- 2) Segredo compartilhado entre pg_cron e as Edge Functions, guardado no
--    Vault (nunca em texto puro no repositório). Gerado uma única vez;
--    reaplicar esta migration não sobrescreve um valor já existente.
select vault.create_secret(
  gen_random_uuid()::text,
  'cron_secret',
  'Header x-cron-secret usado pelo pg_cron para chamar sync-resultados/sync-ao-vivo.'
)
where not exists (select 1 from vault.secrets where name = 'cron_secret');

-- 3) Extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 4) Reagenda sync-resultados (a cada 30 min) com a URL correta do projeto.
select cron.unschedule('sync-resultados-copa')
where exists (select 1 from cron.job where jobname = 'sync-resultados-copa');

select cron.schedule(
  'sync-resultados-copa',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://qrxzbvvnjuunuzfvmqee.supabase.co/functions/v1/sync-resultados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- 5) Reagenda sync-ao-vivo (a cada minuto).
select cron.unschedule('sync-ao-vivo-copa')
where exists (select 1 from cron.job where jobname = 'sync-ao-vivo-copa');

select cron.schedule(
  'sync-ao-vivo-copa',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://qrxzbvvnjuunuzfvmqee.supabase.co/functions/v1/sync-ao-vivo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 25000
  );
  $$
);

-- 6) Limpeza diária de logs com mais de 30 dias.
select cron.unschedule('sync-logs-cleanup')
where exists (select 1 from cron.job where jobname = 'sync-logs-cleanup');

select cron.schedule(
  'sync-logs-cleanup',
  '17 3 * * *',
  $$ delete from sync_logs where created_at < now() - interval '30 days'; $$
);

-- Conferir o agendamento:      select * from cron.job;
-- Ver execuções recentes:      select * from cron.job_run_details order by start_time desc limit 20;
-- Ver os últimos syncs reais:  select * from sync_logs order by created_at desc limit 20;
