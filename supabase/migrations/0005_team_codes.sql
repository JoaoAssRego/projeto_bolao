-- Adiciona códigos ISO 3166-1 alpha-2 (+ subdivisões GB) para geração de bandeiras via emoji Unicode.
-- Populados pelo sync-resultados; nulos em jogos criados manualmente sem passagem pelo sync.
alter table matches add column if not exists home_team_code text;
alter table matches add column if not exists away_team_code text;
