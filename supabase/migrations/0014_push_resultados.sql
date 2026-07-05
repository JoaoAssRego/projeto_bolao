-- ============================================================================
-- Migração: notificações push de resultado (jogo finalizado)
--
-- Quando um jogo entra em finished = true, a Edge Function send-resultado-push
-- (agendada abaixo) notifica dois grupos:
--   - quem palpitou aquele jogo: placar final + pontos ganhos (type='result')
--   - quem não palpitou: convite genérico pra conferir a classificação
--     (type='no_prediction')
--
-- Reaproveita push_subscriptions/VAPID já criados em 0010_push_notifications.sql.
-- Lógica de envio compartilhada com send-lembrete-push via
-- supabase/functions/_shared/webpush.ts.
--
-- Depois de aplicar esta migration:
--   supabase functions deploy send-resultado-push --no-verify-jwt
-- ============================================================================

-- Dedup de envio: garante no máximo um envio por (jogo, participante, tipo),
-- mesmo com o cron rodando a cada 5 min e reavaliando o mesmo jogo enquanto
-- ele estiver dentro da janela de 6h usada pela function.
create table if not exists push_results_sent (
  id bigint generated always as identity primary key,
  match_id uuid not null references matches(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  type text not null check (type in ('result', 'no_prediction')),
  sent_at timestamptz not null default now(),
  unique (match_id, participant_id, type)
);

alter table push_results_sent enable row level security;
-- Sem policies de propósito: só service_role (mesmo padrão de push_reminders_sent).

select cron.unschedule('push-resultado-jogo')
where exists (select 1 from cron.job where jobname = 'push-resultado-jogo');

select cron.schedule(
  'push-resultado-jogo',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://qrxzbvvnjuunuzfvmqee.supabase.co/functions/v1/send-resultado-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- Conferir o agendamento:  select * from cron.job where jobname = 'push-resultado-jogo';
-- Ver os últimos envios:   select * from sync_logs where function_name = 'send-resultado-push' order by created_at desc limit 20;
