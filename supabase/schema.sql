-- ============================================================================
-- Bolão — schema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no Supabase Dashboard > SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem quebrar (usa IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ---------- Tabelas ----------

create table if not exists participants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Login com senha (sem email). Ver migração 0003_login_senha.sql.
-- password_hash: SHA-256 (com sal fixo) calculado no app; NULL = sem senha ainda.
alter table participants add column if not exists password_hash text;
-- has_password: o app lê isto (não o hash) para saber se já há senha definida.
alter table participants
  add column if not exists has_password boolean
  generated always as (password_hash is not null) stored;

create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  stage       text not null check (stage in ('group','r32','r16','qf','sf','third','final')),
  ordering    int  not null default 0,         -- ordem de exibição dentro da fase
  label       text,                            -- ex: "Grupo A", "Oitavas de final"
  home_team   text,                            -- null = "a definir" (mata-mata)
  away_team   text,
  kickoff     timestamptz not null,            -- horário oficial; palpite trava aqui
  home_score  int,
  away_score  int,
  advancer    text check (advancer in ('home','away')),  -- quem avançou (mata-mata)
  finished    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists predictions (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participants(id) on delete cascade,
  match_id        uuid not null references matches(id) on delete cascade,
  home_score      int not null,
  away_score      int not null,
  updated_at      timestamptz not null default now(),
  unique (participant_id, match_id)
);

create index if not exists idx_predictions_match on predictions(match_id);
create index if not exists idx_predictions_participant on predictions(participant_id);
create index if not exists idx_matches_kickoff on matches(kickoff);
-- Torna a seed idempotente: cada (fase, ordem) é único.
create unique index if not exists uniq_matches_stage_ordering on matches(stage, ordering);

-- ---------- Row Level Security ----------
-- POSTURA ACEITA: segurança "na confiança". O app fala direto com o banco pela
-- anon key, então as políticas abaixo são permissivas. A regra de ocultar palpites
-- e de editar só o próprio é aplicada NO APP (cliente), não aqui. Um amigo técnico
-- consegue contornar via DevTools — risco aceito conscientemente para 10 amigos.
-- (Para blindar de verdade no futuro: trocar leituras de predictions por uma view
--  filtrada por kickoff e usar Supabase Auth + auth.uid().)

alter table participants enable row level security;
alter table matches      enable row level security;
alter table predictions  enable row level security;

-- Leitura liberada para todos (anon)
drop policy if exists "leitura participants" on participants;
create policy "leitura participants" on participants for select using (true);
drop policy if exists "leitura matches" on matches;
create policy "leitura matches" on matches for select using (true);
drop policy if exists "leitura predictions" on predictions;
create policy "leitura predictions" on predictions for select using (true);

-- Escrita liberada (gating de admin/dono é feito no app)
drop policy if exists "insere participants" on participants;
create policy "insere participants" on participants for insert with check (true);
-- update liberado: usado para definir a senha (cadastro e primeiro acesso).
drop policy if exists "atualiza participants" on participants;
create policy "atualiza participants" on participants for update using (true) with check (true);

drop policy if exists "insere predictions" on predictions;
create policy "insere predictions" on predictions for insert with check (true);
drop policy if exists "atualiza predictions" on predictions;
create policy "atualiza predictions" on predictions for update using (true) with check (true);

drop policy if exists "insere matches" on matches;
create policy "insere matches" on matches for insert with check (true);
drop policy if exists "atualiza matches" on matches;
create policy "atualiza matches" on matches for update using (true) with check (true);

-- ---------- Realtime ----------
-- Permite que o ranking/jogos atualizem ao vivo no app.
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table predictions;

-- ============================================================================
-- SEED — esqueleto do mata-mata da Copa 2026 (times "a definir").
-- ATENÇÃO: datas/horários são APROXIMADOS (horário de Brasília, -03:00).
-- Ajuste no painel de admin conforme o chaveamento e a tabela oficial saírem.
-- Os jogos de fase de grupos restantes você adiciona pelo admin ("Novo jogo").
-- ============================================================================

insert into matches (stage, ordering, label, kickoff) values
  ('r32', 1,  '32-avos — Jogo 1',  '2026-06-28T13:00:00-03:00'),
  ('r32', 2,  '32-avos — Jogo 2',  '2026-06-28T16:00:00-03:00'),
  ('r32', 3,  '32-avos — Jogo 3',  '2026-06-28T19:00:00-03:00'),
  ('r32', 4,  '32-avos — Jogo 4',  '2026-06-29T13:00:00-03:00'),
  ('r32', 5,  '32-avos — Jogo 5',  '2026-06-29T16:00:00-03:00'),
  ('r32', 6,  '32-avos — Jogo 6',  '2026-06-29T19:00:00-03:00'),
  ('r32', 7,  '32-avos — Jogo 7',  '2026-06-30T13:00:00-03:00'),
  ('r32', 8,  '32-avos — Jogo 8',  '2026-06-30T16:00:00-03:00'),
  ('r32', 9,  '32-avos — Jogo 9',  '2026-07-01T13:00:00-03:00'),
  ('r32', 10, '32-avos — Jogo 10', '2026-07-01T16:00:00-03:00'),
  ('r32', 11, '32-avos — Jogo 11', '2026-07-01T19:00:00-03:00'),
  ('r32', 12, '32-avos — Jogo 12', '2026-07-02T13:00:00-03:00'),
  ('r32', 13, '32-avos — Jogo 13', '2026-07-02T16:00:00-03:00'),
  ('r32', 14, '32-avos — Jogo 14', '2026-07-02T19:00:00-03:00'),
  ('r32', 15, '32-avos — Jogo 15', '2026-07-03T13:00:00-03:00'),
  ('r32', 16, '32-avos — Jogo 16', '2026-07-03T16:00:00-03:00'),
  ('r16', 1,  'Oitavas — Jogo 1',  '2026-07-04T13:00:00-03:00'),
  ('r16', 2,  'Oitavas — Jogo 2',  '2026-07-04T16:00:00-03:00'),
  ('r16', 3,  'Oitavas — Jogo 3',  '2026-07-05T13:00:00-03:00'),
  ('r16', 4,  'Oitavas — Jogo 4',  '2026-07-05T16:00:00-03:00'),
  ('r16', 5,  'Oitavas — Jogo 5',  '2026-07-06T13:00:00-03:00'),
  ('r16', 6,  'Oitavas — Jogo 6',  '2026-07-06T16:00:00-03:00'),
  ('r16', 7,  'Oitavas — Jogo 7',  '2026-07-07T13:00:00-03:00'),
  ('r16', 8,  'Oitavas — Jogo 8',  '2026-07-07T16:00:00-03:00'),
  ('qf',  1,  'Quartas — Jogo 1',  '2026-07-09T16:00:00-03:00'),
  ('qf',  2,  'Quartas — Jogo 2',  '2026-07-10T16:00:00-03:00'),
  ('qf',  3,  'Quartas — Jogo 3',  '2026-07-11T13:00:00-03:00'),
  ('qf',  4,  'Quartas — Jogo 4',  '2026-07-11T16:00:00-03:00'),
  ('sf',  1,  'Semifinal — Jogo 1','2026-07-14T16:00:00-03:00'),
  ('sf',  2,  'Semifinal — Jogo 2','2026-07-15T16:00:00-03:00'),
  ('third', 1,'Disputa de 3º lugar','2026-07-18T16:00:00-03:00'),
  ('final', 1,'Final',             '2026-07-19T16:00:00-03:00')
on conflict do nothing;
