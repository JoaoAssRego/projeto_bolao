-- ============================================================================
-- Bolão da Copa — migração: login com senha (sem email).
-- Cole no Supabase Dashboard > SQL Editor > Run.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- Hash da senha (SHA-256 com sal fixo, calculado no app). NULL = participante
-- antigo que ainda não definiu senha; ele define no primeiro acesso.
alter table participants add column if not exists password_hash text;

-- Coluna gerada: o app lê isto (e NÃO o hash) para saber se já há senha.
-- Assim o hash nunca é trafegado para os outros clientes no carregamento/realtime.
alter table participants
  add column if not exists has_password boolean
  generated always as (password_hash is not null) stored;

-- Libera UPDATE em participants (definir senha no cadastro e no primeiro acesso).
drop policy if exists "atualiza participants" on participants;
create policy "atualiza participants" on participants for update using (true) with check (true);
