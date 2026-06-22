-- ============================================================================
-- Migração: Supabase Auth + RLS real
--
-- Cada participante passa a ter uma conta em auth.users (auth_user_id).
-- As políticas de INSERT/UPDATE deixam de ser "true" e passam a exigir
-- auth.uid() real — sem sessão (anon pura / DevTools) não escreve nada.
--
-- Pré-requisito no Supabase Dashboard:
--   Authentication → Settings → "Enable email confirmations" → OFF
--   (login retorna sessão imediatamente, sem precisar confirmar e-mail)
-- ============================================================================

-- 1. Coluna de vínculo com auth.users
alter table participants
  add column if not exists auth_user_id uuid unique references auth.users(id);

-- 2. Coluna derivada: indica se o participante já tem conta auth
alter table participants
  add column if not exists has_auth boolean
  generated always as (auth_user_id is not null) stored;

-- 3. Helpers (security definer evita recursão no RLS)

create or replace function public.current_participant_id()
returns uuid language sql security definer stable
set search_path = public as $$
  select id from participants where auth_user_id = auth.uid()
$$;

create or replace function public.current_is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select coalesce(
    (select is_admin from participants where auth_user_id = auth.uid()),
    false
  )
$$;

-- 4. RPC de auto-vinculação: participante antigo (sem auth_user_id) usa no
--    primeiro login para ligar sua linha existente à nova conta auth.users.
--    security definer → bypassa RLS (só altera linhas com auth_user_id IS NULL).
create or replace function public.claim_participant(p_name text)
returns void language sql security definer
set search_path = public as $$
  update participants
  set auth_user_id = auth.uid()
  where name = p_name
    and auth_user_id is null
    and auth.uid() is not null;
$$;

-- 5. Remover políticas permissivas antigas
drop policy if exists "insere participants" on participants;
drop policy if exists "atualiza participants" on participants;
drop policy if exists "insere predictions" on predictions;
drop policy if exists "atualiza predictions" on predictions;
drop policy if exists "insere matches" on matches;
drop policy if exists "atualiza matches" on matches;

-- 6. Políticas seguras

-- participants: só pode inserir linha vinculada à própria conta auth
create policy "insere participants" on participants for insert
  with check (auth_user_id = auth.uid());

-- participants: só pode atualizar a própria linha; admin pode atualizar qualquer uma
create policy "atualiza participants" on participants for update
  using  (auth_user_id = auth.uid() or current_is_admin())
  with check (auth_user_id = auth.uid() or current_is_admin());

-- predictions: só o dono pode salvar seus palpites
create policy "insere predictions" on predictions for insert
  with check (participant_id = current_participant_id());

create policy "atualiza predictions" on predictions for update
  using  (participant_id = current_participant_id())
  with check (participant_id = current_participant_id());

-- matches: só admin pode inserir/alterar resultados
create policy "insere matches" on matches for insert
  with check (current_is_admin());

create policy "atualiza matches" on matches for update
  using  (current_is_admin())
  with check (current_is_admin());
