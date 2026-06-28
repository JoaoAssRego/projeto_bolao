-- Adiciona status 'requested' para pedidos de entrada via link de convite.
-- 'pending'   = convite enviado pelo criador, aguarda o convidado aceitar
-- 'requested' = pedido enviado pelo usuário via link, aguarda aprovação do criador
-- 'accepted'  = membro confirmado

alter table league_members drop constraint league_members_status_check;
alter table league_members add constraint league_members_status_check
  check (status in ('pending', 'requested', 'accepted'));

-- Atualiza o RPC: via link o usuário entra como 'requested', não 'accepted'.
-- Se já tinha um convite por nome ('pending'), esse é promovido para 'accepted' diretamente
-- (o criador já havia convidado, então a aprovação é implícita).
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
    if v_existing.status = 'requested' then return 'already_requested'; end if;
    -- Tinha convite por nome pendente: promove para aceito (aprovação implícita)
    update league_members set status = 'accepted'
      where league_id = v_link.league_id and participant_id = v_me_id;
    update league_invite_links set use_count = use_count + 1 where id = p_token;
    return 'ok_accepted';
  end if;

  insert into league_members (league_id, participant_id, status, invited_by)
    values (v_link.league_id, v_me_id, 'requested', v_link.created_by);

  update league_invite_links set use_count = use_count + 1 where id = p_token;
  return 'ok';
end;
$$;
