-- Extensão para normalização de texto sem acento (necessária para o índice de nome único).
create extension if not exists unaccent;

-- unaccent() não é IMMUTABLE por padrão, mas índices exigem funções imutáveis.
-- Esta wrapper declara a imutabilidade explicitamente (seguro para uso em índice de unicidade).
create or replace function f_unaccent(text)
  returns text
  language sql immutable strict parallel safe as
$$ select public.unaccent($1) $$;

-- Garante unicidade de nomes mesmo com variações de acento/casing.
-- Exemplo: "João" e "Joao" não podem coexistir.
-- ATENÇÃO: se já houver nomes duplicados após normalização, este comando falhará.
-- Resolva manualmente antes de aplicar.
create unique index if not exists idx_participants_name_normalized
  on participants (lower(f_unaccent(name)));

-- Links de convite por liga (coletivo, compartilhável via WhatsApp).
create table if not exists league_invite_links (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references leagues(id) on delete cascade,
  created_by  uuid not null references participants(id),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  max_uses    int not null default 50,
  use_count   int not null default 0,
  is_revoked  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_invite_links_league on league_invite_links(league_id);

alter table league_invite_links enable row level security;

drop policy if exists "leitura invite_links"   on league_invite_links;
create policy "leitura invite_links"   on league_invite_links for select using (true);
drop policy if exists "insere invite_links"    on league_invite_links;
create policy "insere invite_links"    on league_invite_links for insert with check (true);
drop policy if exists "atualiza invite_links"  on league_invite_links;
create policy "atualiza invite_links"  on league_invite_links for update using (true) with check (true);
drop policy if exists "exclui invite_links"    on league_invite_links;
create policy "exclui invite_links"    on league_invite_links for delete using (true);

-- RPC: processa um link de convite para o usuário autenticado atual.
-- Retorna: 'ok' | 'already_member' | 'not_found' | 'revoked' | 'expired' | 'full' | 'not_authenticated'
create or replace function accept_invite_by_token(p_token uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_link     league_invite_links%rowtype;
  v_me_id    uuid;
  v_existing league_members%rowtype;
begin
  select id into v_me_id from participants where auth_user_id = auth.uid();
  if v_me_id is null then
    return 'not_authenticated';
  end if;

  select * into v_link from league_invite_links where id = p_token;
  if not found then return 'not_found'; end if;
  if v_link.is_revoked then return 'revoked'; end if;
  if v_link.expires_at < now() then return 'expired'; end if;
  if v_link.use_count >= v_link.max_uses then return 'full'; end if;

  select * into v_existing
    from league_members
    where league_id = v_link.league_id and participant_id = v_me_id;

  if found then
    if v_existing.status = 'accepted' then return 'already_member'; end if;
    -- Convite por nome já existia como pendente: promove para aceito
    update league_members set status = 'accepted'
      where league_id = v_link.league_id and participant_id = v_me_id;
    update league_invite_links set use_count = use_count + 1 where id = p_token;
    return 'ok';
  end if;

  insert into league_members (league_id, participant_id, status, invited_by)
    values (v_link.league_id, v_me_id, 'accepted', v_link.created_by);

  update league_invite_links set use_count = use_count + 1 where id = p_token;
  return 'ok';
end;
$$;
