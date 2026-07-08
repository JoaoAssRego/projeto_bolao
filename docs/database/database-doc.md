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

> *Em desenvolvimento — Fase 1 do multi-torneio ([prd-multi-torneio-champions-league.md](../prd/prd-multi-torneio-champions-league.md)).* Um registro por campeonato de futebol (Copa do Mundo, Champions League, e futuramente Libertadores/Copa do Brasil). Não confundir com `leagues` (subgrupos de amigos dentro de um torneio).

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
| `torneio_id`     | `uuid`        | *Em desenvolvimento* — FK `torneios.id`, obrigatória após backfill |
| `tie_id`         | `uuid`        | *Em desenvolvimento* — Nullable; agrupa ida/volta do mesmo confronto |
| `leg`            | `text`        | *Em desenvolvimento* — Nullable; `'ida'` \| `'volta'` |

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
