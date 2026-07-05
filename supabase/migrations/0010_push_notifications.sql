-- ============================================================================
-- Migração: notificações push (lembrete de fechamento de janela)
--
-- Reverte a decisão "Sem Web Push" do ESPECIFICACAO.md: adiciona armazenamento
-- de inscrições Web Push por participante e uma tabela de dedup para o envio
-- do lembrete ("jogo fecha em breve e você não palpitou"), disparado por uma
-- nova Edge Function (send-lembrete-push) agendada via pg_cron.
--
-- Depois de aplicar esta migration:
--   1) Gerar par de chaves VAPID (uma vez só): npx web-push generate-vapid-keys
--   2) supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
--   3) Adicionar VITE_VAPID_PUBLIC_KEY=... no .env (frontend) e na Vercel
--   4) supabase functions deploy send-lembrete-push --no-verify-jwt
-- ============================================================================

-- 1) Inscrições Web Push, uma por dispositivo/navegador do participante.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_participant
  on push_subscriptions(participant_id);

alter table push_subscriptions enable row level security;

drop policy if exists "insere push_subscriptions" on push_subscriptions;
create policy "insere push_subscriptions" on push_subscriptions for insert
  with check (participant_id = current_participant_id());

drop policy if exists "remove push_subscriptions" on push_subscriptions;
create policy "remove push_subscriptions" on push_subscriptions for delete
  using (participant_id = current_participant_id());

-- Permite "assumir" uma inscrição já existente (upsert por endpoint único):
-- o navegador reaproveita a mesma PushSubscription por origem, então em um
-- dispositivo compartilhado por dois participantes o segundo login precisa
-- conseguir reatribuir a linha para si. O USING(true) só localiza a linha;
-- o WITH CHECK garante que ela sempre termina pertencendo a quem está logado.
drop policy if exists "atualiza push_subscriptions" on push_subscriptions;
create policy "atualiza push_subscriptions" on push_subscriptions for update
  using (true)
  with check (participant_id = current_participant_id());

-- Sem policy de select: o participante nunca precisa listar inscrições pelo
-- client; a Edge Function lê tudo via service_role.

-- 2) Dedup de envio: garante no máximo um lembrete por jogo/participante,
--    mesmo com o cron rodando a cada 5 min e reavaliando a mesma janela.
create table if not exists push_reminders_sent (
  id bigint generated always as identity primary key,
  match_id uuid not null references matches(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (match_id, participant_id)
);

alter table push_reminders_sent enable row level security;
-- Sem policies de propósito: só service_role (mesmo padrão de sync_logs).

-- 3) Agenda o envio do lembrete a cada 5 minutos.
select cron.unschedule('push-lembrete-fechamento')
where exists (select 1 from cron.job where jobname = 'push-lembrete-fechamento');

select cron.schedule(
  'push-lembrete-fechamento',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://qrxzbvvnjuunuzfvmqee.supabase.co/functions/v1/send-lembrete-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- Conferir o agendamento:  select * from cron.job where jobname = 'push-lembrete-fechamento';
