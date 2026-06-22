-- Ligas: sub-grupos que filtram o ranking do bolão global.
-- O criador é adicionado como membro aceito na criação (via app).
-- Cole este arquivo no Supabase Dashboard > SQL Editor > Run.

create table if not exists leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  creator_id  uuid not null references participants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (creator_id, name)
);

create table if not exists league_members (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references leagues(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  status          text not null check (status in ('pending', 'accepted')),
  invited_by      uuid not null references participants(id),
  created_at      timestamptz not null default now(),
  unique (league_id, participant_id)
);

create index if not exists idx_league_members_participant on league_members(participant_id);
create index if not exists idx_league_members_league     on league_members(league_id);

-- RLS: mesma postura permissiva do restante do app (trust-based, grupo fechado).
alter table leagues       enable row level security;
alter table league_members enable row level security;

drop policy if exists "leitura leagues"        on leagues;
create policy "leitura leagues"        on leagues for select using (true);
drop policy if exists "insere leagues"         on leagues;
create policy "insere leagues"         on leagues for insert with check (true);
drop policy if exists "atualiza leagues"       on leagues;
create policy "atualiza leagues"       on leagues for update using (true) with check (true);
drop policy if exists "exclui leagues"         on leagues;
create policy "exclui leagues"         on leagues for delete using (true);

drop policy if exists "leitura league_members" on league_members;
create policy "leitura league_members" on league_members for select using (true);
drop policy if exists "insere league_members"  on league_members;
create policy "insere league_members"  on league_members for insert with check (true);
drop policy if exists "atualiza league_members" on league_members;
create policy "atualiza league_members" on league_members for update using (true) with check (true);
drop policy if exists "exclui league_members"  on league_members;
create policy "exclui league_members"  on league_members for delete using (true);

-- Realtime para atualizar badges e rankings ao vivo.
alter publication supabase_realtime add table leagues;
alter publication supabase_realtime add table league_members;
