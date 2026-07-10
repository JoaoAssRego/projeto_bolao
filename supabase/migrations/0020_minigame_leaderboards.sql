-- ============================================================================
-- Migração: leaderboards do Mini Games ("Refaça a Glória")
--
-- Até aqui o mini game era localStorage only (um placar por aparelho, sem
-- comparação entre participantes). Esta migration cria dois placares COMPARTILHADOS
-- e GLOBAIS (todo o bolão se vê, mesmo padrão do ranking oficial: SELECT público,
-- escrita só do dono):
--
--   1) minigame_campaign_scores — MELHOR resultado de cada participante por
--      campanha (um ranking por campanha; campanhas têm pontuação máxima
--      diferente, então não faz sentido somar entre elas).
--   2) minigame_daily_scores — a jogada do desafio do dia (uma por dia por
--      participante), guardada com a data para permitir os recortes
--      semana / mês / total.
--
-- A escrita passa por RPCs security definer para centralizar as regras
-- ("só o melhor conta" / "a primeira jogada do dia conta") no banco, em vez de
-- confiar no cliente. A leitura é direta (RLS SELECT público) + uma RPC de
-- agregação para o ranking diário.
--
-- Depois de aplicar: supabase db push (ou aplicar no SQL Editor).
-- ============================================================================

-- ─── 1) Placar por campanha (melhor resultado) ──────────────────────────────────
create table if not exists minigame_campaign_scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  campaign_id text not null,           -- id curado no front (ex: 'flamengo-lib-2019')
  best_total int not null,
  max_total int not null,
  exacts int not null default 0,        -- placares cravados na melhor jogada
  scorer_correct boolean not null default false,
  plays int not null default 1,
  updated_at timestamptz not null default now(),
  unique (participant_id, campaign_id)
);

create index if not exists idx_mg_campaign_scores_campaign
  on minigame_campaign_scores(campaign_id, best_total desc);

alter table minigame_campaign_scores enable row level security;

-- Leitura pública (ranking global). Escrita só via RPC (security definer).
drop policy if exists "leitura minigame_campaign_scores" on minigame_campaign_scores;
create policy "leitura minigame_campaign_scores" on minigame_campaign_scores
  for select using (true);

-- ─── 2) Placar do desafio do dia (uma jogada por dia) ───────────────────────────
create table if not exists minigame_daily_scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  play_date date not null,             -- YYYY-MM-DD no fuso de Brasília (definido no front)
  campaign_id text not null,
  match_index int not null,
  points int not null,
  created_at timestamptz not null default now(),
  unique (participant_id, play_date)   -- a primeira jogada do dia é a que vale
);

create index if not exists idx_mg_daily_scores_date
  on minigame_daily_scores(play_date);

alter table minigame_daily_scores enable row level security;

drop policy if exists "leitura minigame_daily_scores" on minigame_daily_scores;
create policy "leitura minigame_daily_scores" on minigame_daily_scores
  for select using (true);

-- ─── 3) RPC: submeter resultado de campanha (mantém só o melhor) ─────────────────
create or replace function public.submit_minigame_campaign_score(
  p_campaign_id text,
  p_total int,
  p_max int,
  p_exacts int,
  p_scorer_correct boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  pid := current_participant_id();
  if pid is null then
    raise exception 'sem participante vinculado à sessão';
  end if;

  -- Validação de faixa: o placar é curado no front (jogos * 10 + 10 do artilheiro),
  -- então 500 é um teto folgado. Impede inflar o ranking com valores absurdos.
  -- Cada placar cravado vale 10 pts, logo exacts*10 nunca excede o total.
  if p_max < 0 or p_max > 500
     or p_total < 0 or p_total > p_max
     or p_exacts < 0 or p_exacts * 10 > p_total then
    raise exception 'valores de pontuação fora da faixa válida';
  end if;

  insert into minigame_campaign_scores
    (participant_id, campaign_id, best_total, max_total, exacts, scorer_correct, plays, updated_at)
  values
    (pid, p_campaign_id, p_total, p_max, p_exacts, p_scorer_correct, 1, now())
  on conflict (participant_id, campaign_id) do update set
    best_total     = greatest(minigame_campaign_scores.best_total, excluded.best_total),
    exacts         = greatest(minigame_campaign_scores.exacts, excluded.exacts),
    scorer_correct = minigame_campaign_scores.scorer_correct or excluded.scorer_correct,
    max_total      = excluded.max_total,
    plays          = minigame_campaign_scores.plays + 1,
    updated_at     = now();
end $$;

-- ─── 4) RPC: submeter jogada do desafio do dia (idempotente por dia) ─────────────
create or replace function public.submit_minigame_daily_score(
  p_play_date date,
  p_campaign_id text,
  p_match_index int,
  p_points int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  pid := current_participant_id();
  if pid is null then
    raise exception 'sem participante vinculado à sessão';
  end if;

  -- Validação de faixa: os pontos são o resultado de scoreGuess, sempre 0/5/7/10.
  -- Qualquer outro valor é adulteração — rejeita.
  if p_points not in (0, 5, 7, 10) or p_match_index < 0 then
    raise exception 'pontuação diária fora da faixa válida';
  end if;

  insert into minigame_daily_scores
    (participant_id, play_date, campaign_id, match_index, points)
  values
    (pid, p_play_date, p_campaign_id, p_match_index, p_points)
  on conflict (participant_id, play_date) do nothing; -- a primeira jogada do dia vale
end $$;

-- ─── 5) RPC: ranking diário agregado por recorte (p_since null = total) ──────────
create or replace function public.minigame_daily_leaderboard(p_since date default null)
returns table (
  participant_id uuid,
  name text,
  total_points bigint,
  days_played bigint
)
language sql stable security definer set search_path = public as $$
  select
    d.participant_id,
    p.name,
    sum(d.points)::bigint  as total_points,
    count(*)::bigint       as days_played
  from minigame_daily_scores d
  join participants p on p.id = d.participant_id
  where p_since is null or d.play_date >= p_since
  group by d.participant_id, p.name
  order by sum(d.points) desc, count(*) desc, p.name asc;
$$;

-- ─── 6) Permissões de execução ───────────────────────────────────────────────────
grant execute on function public.submit_minigame_campaign_score(text, int, int, int, boolean) to anon, authenticated;
grant execute on function public.submit_minigame_daily_score(date, text, int, int) to anon, authenticated;
grant execute on function public.minigame_daily_leaderboard(date) to anon, authenticated;
