## Table `participants`

### Columns

| Name            | Type          | Constraints     |
| --------------- | ------------- | --------------- |
| `id`            | `uuid`        | Primary         |
| `name`          | `text`        | Unique          |
| `is_admin`      | `bool`        |                 |
| `created_at`    | `timestamptz` |                 |
| `password_hash` | `text`        | Nullable        |
| `has_password`  | `bool`        | Nullable        |
| `auth_user_id`  | `uuid`        | Nullable Unique |
| `has_auth`      | `bool`        | Nullable        |

## Table `torneios`

> Um registro por campeonato de futebol (Copa do Mundo, Champions League, Copa Libertadores, Copa do Brasil). Não confundir com `leagues` (subgrupos de amigos dentro de um torneio). `data_source` decide qual Edge Function de sync processa o torneio: `'football-data.org'` → `sync-resultados`; `'bsd-football-api'` → `sync-resultados-bsd`. Ver [prd-multi-torneio-champions-league.md](../prd/prd-multi-torneio-champions-league.md) (Fase 1) e memória do projeto `project_multi_torneio.md` (Fase 2 — Libertadores/Copa do Brasil via BSD Football API).

### Columns

| Name                | Type          | Constraints    |
| ------------------- | ------------- | -------------- |
| `id`                | `uuid`        | Primary        |
| `nome`               | `text`        |                |
| `slug`               | `text`        | Unique         |
| `competition_code`   | `text`        |                |
| `data_source`        | `text`        |                |
| `starts_at`          | `timestamptz` | Nullable       |
| `ends_at`            | `timestamptz` | Nullable       |
| `is_active`          | `bool`        |                |
| `is_featured`        | `bool`        |                |
| `created_at`         | `timestamptz` |                |
| `bsd_league_id`      | `int4`        | Nullable — só usada quando `data_source = 'bsd-football-api'` |
| `bsd_season_id`      | `int4`        | Nullable — só usada quando `data_source = 'bsd-football-api'` |

## Table `matches`

### Columns

| Name             | Type          | Constraints |
| ---------------- | ------------- | ----------- |
| `id`             | `uuid`        | Primary     |
| `stage`          | `text`        |             |
| `ordering`       | `int4`        |             |
| `label`          | `text`        | Nullable    |
| `home_team`      | `text`        | Nullable    |
| `away_team`      | `text`        | Nullable    |
| `kickoff`        | `timestamptz` |             |
| `home_score`     | `int4`        | Nullable    |
| `away_score`     | `int4`        | Nullable    |
| `advancer`       | `text`        | Nullable    |
| `finished`       | `bool`        |             |
| `created_at`     | `timestamptz` |             |
| `external_id`    | `int8`        | Nullable    |
| `result_source`  | `text`        |             |
| `last_synced_at` | `timestamptz` | Nullable    |
| `home_team_code` | `text`        | Nullable    |
| `away_team_code` | `text`        | Nullable    |
| `torneio_id`     | `uuid`        | FK `torneios.id`, not null |
| `tie_id`         | `uuid`        | Nullable; agrupa ida/volta do mesmo confronto |
| `leg`            | `text`        | Nullable; `'ida'` \| `'volta'` |
| `home_team_id`   | `int4`        | Nullable; id de time da BSD Football API (`0018_matches_team_ids.sql`) — usado pra resolver o escudo do clube via `sports.bzzoiro.com/img/team/{id}/`. Só populado para Libertadores/Copa do Brasil; `null` em Copa do Mundo/Champions League (sync via football-data.org). |
| `away_team_id`   | `int4`        | Nullable; mesma origem/uso de `home_team_id`. |

### Constraints relevantes

- `uniq_matches_torneio_external_id` — único em `(torneio_id, external_id) where external_id is not null`. Escopado por torneio desde `0016_torneios_libertadores_copa_brasil.sql`: antes era global (`uniq_matches_external_id`), o que colidia entre ids de eventos de fontes diferentes (football-data.org vs BSD Football API).
- `uniq_matches_torneio_stage_ordering` — único em `(torneio_id, stage, ordering)`. Escopado por torneio desde `0017_fix_stage_ordering_uniqueness.sql`: antes era global (`uniq_matches_stage_ordering`, em `schema.sql`), o que colidia entre torneios que compartilham nome de fase (ex: `r16`, `qf`, `sf`, `final` usados tanto pela Champions League quanto por Libertadores/Copa do Brasil).

## Table `sync_logs`

> Heartbeat + histórico das Edge Functions de sync (`sync-resultados`, `sync-resultados-bsd`). Sem RLS de leitura pública — só service role/SQL Editor. Ver `0009_sync_observability_cron.sql`.

### Columns

| Name            | Type          | Constraints |
| --------------- | ------------- | ----------- |
| `id`            | `int8`        | Primary (identity) |
| `function_name` | `text`        |             |
| `status`        | `text`        | `'ok'` \| `'skipped'` \| `'error'` |
| `summary`       | `jsonb`       | Nullable    |
| `created_at`    | `timestamptz` |             |

## Table `predictions`

### Columns

| Name             | Type          | Constraints |
| ---------------- | ------------- | ----------- |
| `id`             | `uuid`        | Primary     |
| `participant_id` | `uuid`        |             |
| `match_id`       | `uuid`        |             |
| `home_score`     | `int4`        |             |
| `away_score`     | `int4`        |             |
| `updated_at`     | `timestamptz` |             |

## Table `leagues`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `uuid`        | Primary     |
| `name`       | `text`        |             |
| `creator_id` | `uuid`        |             |
| `created_at` | `timestamptz` |             |
| `starts_at`  | `timestamptz` | Nullable    |
| `torneio_id` | `uuid`        | *Em desenvolvimento* — FK `torneios.id`, obrigatória após backfill |

## Table `league_members`

### Columns

| Name             | Type          | Constraints |
| ---------------- | ------------- | ----------- |
| `id`             | `uuid`        | Primary     |
| `league_id`      | `uuid`        |             |
| `participant_id` | `uuid`        |             |
| `status`         | `text`        |             |
| `invited_by`     | `uuid`        |             |
| `created_at`     | `timestamptz` |             |

## Table `league_invite_links`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `uuid`        | Primary     |
| `league_id`  | `uuid`        |             |
| `created_by` | `uuid`        |             |
| `expires_at` | `timestamptz` |             |
| `max_uses`   | `int4`        |             |
| `use_count`  | `int4`        |             |
| `is_revoked` | `bool`        |             |
| `created_at` | `timestamptz` |             |

## Table `push_subscriptions`

### Columns

| Name             | Type          | Constraints |
| ---------------- | ------------- | ----------- |
| `id`             | `uuid`        | Primary     |
| `participant_id` | `uuid`        |             |
| `endpoint`       | `text`        | Unique      |
| `p256dh`         | `text`        |             |
| `auth_key`       | `text`        |             |
| `user_agent`     | `text`        | Nullable    |
| `created_at`     | `timestamptz` |             |

## Table `push_reminders_sent`

### Columns

| Name             | Type          | Constraints                     |
| ---------------- | ------------- | -------------------------------- |
| `id`             | `int8`        | Primary                          |
| `match_id`       | `uuid`        |                                   |
| `participant_id` | `uuid`        |                                   |
| `sent_at`        | `timestamptz` |                                   |
|                  |               | Unique (`match_id`, `participant_id`) |
