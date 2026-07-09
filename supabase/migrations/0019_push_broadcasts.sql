-- Dedup para pushes de broadcast (anúncio único enviado a todos os
-- participantes inscritos, não ligado a uma partida). Permite reexecutar a
-- edge function send-broadcast-push sem duplicar envios.
create table if not exists push_broadcasts_sent (
  broadcast_id text not null,
  participant_id uuid not null references participants(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (broadcast_id, participant_id)
);

alter table push_broadcasts_sent enable row level security;
