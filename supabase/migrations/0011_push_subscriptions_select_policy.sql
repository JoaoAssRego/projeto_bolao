-- ============================================================================
-- Migração: policy de SELECT faltante em push_subscriptions
--
-- Diagnóstico: o upsert do client (supabase-js) pede a linha de volta por
-- padrão (Prefer: return=representation), e o Postgres precisa da policy de
-- SELECT pra decidir se a linha inserida é "visível" antes de devolvê-la —
-- mesmo numa operação de INSERT. Sem policy de SELECT, RLS nega com a mesma
-- mensagem de "new row violates row-level security policy", mesmo que a
-- policy de INSERT (with check) esteja correta. Confirmado testando direto
-- no banco: INSERT sem RETURNING funciona, com RETURNING falha.
-- ============================================================================

drop policy if exists "leitura push_subscriptions" on push_subscriptions;
create policy "leitura push_subscriptions" on push_subscriptions for select
  using (participant_id = current_participant_id());
