-- ============================================================================
-- Migração: log de diagnóstico de ativação de push
--
-- Contexto: usuários reais em aparelhos novos (nunca abriram o app antes)
-- relataram Notification.permission voltando bloqueado sem nem mostrar o
-- diálogo nativo do sistema, tanto em Android quanto em iOS instalado. Sem
-- acesso físico ao aparelho não dá pra inspecionar o estado real da
-- permissão — essa tabela guarda, a cada tentativa de ativação (sucesso ou
-- falha), o suficiente pra diagnosticar remotamente da próxima vez.
-- ============================================================================

create table if not exists push_debug_log (
  id bigint generated always as identity primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  platform text not null,
  standalone boolean not null,
  permission_before text,
  permission_after text,
  error_name text,
  error_message text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_debug_log_participant
  on push_debug_log(participant_id);

alter table push_debug_log enable row level security;

drop policy if exists "insere push_debug_log" on push_debug_log;
create policy "insere push_debug_log" on push_debug_log for insert
  with check (participant_id = current_participant_id());

-- Sem policy de select: só o dev lê via dashboard/service_role, mesmo padrão
-- de push_reminders_sent.
