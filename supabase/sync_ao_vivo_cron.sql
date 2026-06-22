-- ============================================================================
-- Cron do sync ao vivo — chama a Edge Function a cada minuto.
-- Rode no Supabase Dashboard > SQL Editor APÓS:
--   1) ter feito deploy: supabase functions deploy sync-ao-vivo
--   2) ter setado o segredo: supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
--
-- ANTES de rodar, substitua os DOIS placeholders abaixo:
--   <SEU-REF>      -> ref do projeto (ex: abcd1234), visível na URL do dashboard
--   <SUA-ANON-KEY> -> anon key (Project Settings > API)
--
-- Nota: a função retorna imediatamente sem chamar a API quando não há jogos
-- ao vivo — sem desperdício de cota mesmo rodando a cada minuto.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior com o mesmo nome (torna este script repetível).
select cron.unschedule('sync-ao-vivo-copa')
where exists (select 1 from cron.job where jobname = 'sync-ao-vivo-copa');

-- Agenda: a cada minuto.
select cron.schedule(
  'sync-ao-vivo-copa',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://a371aa8579b249cabc59a4292f3c1810.supabase.co/functions/v1/sync-ao-vivo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHpidnZuanV1bnV6ZnZtcWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjM0MzcsImV4cCI6MjA5NzYzOTQzN30.UMioacap_1GUWnmvCug2CJN0N-kym3HP7iesVeplFRM'
    ),
    timeout_milliseconds := 25000
  );
  $$
);

-- Conferir o agendamento:           select * from cron.job;
-- Ver execuções recentes:           select * from cron.job_run_details order by start_time desc limit 20;
-- Cancelar:                         select cron.unschedule('sync-ao-vivo-copa');
