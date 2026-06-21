-- ============================================================================
-- Agendamento do sync de resultados (chama a Edge Function a cada 30 min).
-- Rode no Supabase Dashboard > SQL Editor APÓS:
--   1) ter aplicado supabase/migrations/0002_sync_api.sql
--   2) ter feito deploy da função: supabase functions deploy sync-resultados
--   3) ter setado o segredo: supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
--
-- ANTES de rodar, substitua os DOIS placeholders abaixo:
--   <SEU-REF>     -> o ref do projeto (ex: abcd1234), visível na URL do dashboard
--   <SUA-ANON-KEY>-> a anon key (Project Settings > API). A função aceita a anon
--                    key como Bearer (verify_jwt padrão). NUNCA use a service key aqui.
-- ============================================================================

-- Extensões necessárias (ative também em Database > Extensions, se preciso).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior com o mesmo nome (torna este script repetível).
select cron.unschedule('sync-resultados-copa')
where exists (select 1 from cron.job where jobname = 'sync-resultados-copa');

-- Agenda: a cada 30 minutos.
select cron.schedule(
  'sync-resultados-copa',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://a371aa8579b249cabc59a4292f3c1810.supabase.co/functions/v1/sync-resultados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUA-ANON-KEY>'
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- Conferir o agendamento:           select * from cron.job;
-- Ver execuções recentes:           select * from cron.job_run_details order by start_time desc limit 10;
-- Cancelar:                         select cron.unschedule('sync-resultados-copa');
