-- Fase 1 do multi-torneio: transforma o bolão de "um torneio fechado" em
-- "múltiplos torneios concorrentes". Ver docs/prd/prd-multi-torneio-champions-league.md.
--
-- Aditiva e segura de rodar em produção com jogos em andamento:
--  - torneio_id entra NULLABLE, é populado por backfill, e só então vira NOT NULL.
--  - Nenhuma linha existente de matches/leagues é removida ou perde dados.
--
-- Cole este arquivo no Supabase Dashboard > SQL Editor > Run.

-- ── Tabela torneios ──────────────────────────────────────────────────────────
-- Um registro por campeonato de futebol (Copa do Mundo, Champions League...).
-- Não confundir com `leagues` (subgrupos de amigos dentro de um torneio).
-- Sem tela de admin nesta fase: novos torneios são inseridos manualmente aqui.
create table if not exists torneios (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  slug              text not null unique,
  competition_code  text not null,              -- código na football-data.org: 'WC', 'CL'
  data_source       text not null default 'football-data.org',
  starts_at         timestamptz,
  ends_at           timestamptz,
  is_active         bool not null default true, -- torneios encerrados somem do seletor
  is_featured       bool not null default false, -- torneio padrão na primeira visita
  created_at        timestamptz not null default now()
);

alter table torneios enable row level security;

-- Leitura liberada (o seletor de torneio precisa listar todos os ativos).
-- Sem policy de insert/update/delete: gestão é manual via service role (SQL Editor).
drop policy if exists "leitura torneios" on torneios;
create policy "leitura torneios" on torneios for select using (true);

alter publication supabase_realtime add table torneios;

-- ── Seed: Copa do Mundo 2026 e Champions League 2026/27 ─────────────────────
insert into torneios (nome, slug, competition_code, is_featured)
values ('Copa do Mundo 2026', 'copa-2026', 'WC', true)
on conflict (slug) do nothing;

insert into torneios (nome, slug, competition_code, is_featured)
values ('Champions League 2026/27', 'champions-2026-27', 'CL', false)
on conflict (slug) do nothing;

-- ── matches: torneio_id + suporte a confrontos de ida e volta ───────────────
alter table matches add column if not exists torneio_id uuid references torneios(id);
alter table matches add column if not exists tie_id uuid; -- agrupa ida/volta do mesmo confronto
alter table matches add column if not exists leg text;
alter table matches drop constraint if exists matches_leg_check;
alter table matches add constraint matches_leg_check check (leg in ('ida', 'volta') or leg is null);

-- ── leagues: torneio_id (liga passa a ser escopada a um torneio) ───────────
alter table leagues add column if not exists torneio_id uuid references torneios(id);

-- ── Backfill: todo dado existente pertence à Copa do Mundo 2026 ────────────
update matches
set torneio_id = (select id from torneios where slug = 'copa-2026')
where torneio_id is null;

update leagues
set torneio_id = (select id from torneios where slug = 'copa-2026')
where torneio_id is null;

-- ── Torna obrigatório depois do backfill ────────────────────────────────────
alter table matches alter column torneio_id set not null;
alter table leagues alter column torneio_id set not null;

create index if not exists idx_matches_torneio on matches(torneio_id);
create index if not exists idx_matches_tie on matches(tie_id);
create index if not exists idx_leagues_torneio on leagues(torneio_id);
