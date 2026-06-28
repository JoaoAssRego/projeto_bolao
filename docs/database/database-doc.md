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
