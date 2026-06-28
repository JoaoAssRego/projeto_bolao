-- Adiciona data de início da contagem de pontos na liga.
-- Quando null, continua usando created_at como antes (retrocompatível).
alter table leagues add column if not exists starts_at timestamptz;
