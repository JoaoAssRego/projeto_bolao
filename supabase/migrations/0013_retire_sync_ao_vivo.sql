-- ============================================================================
-- Migração: aposenta o sync-ao-vivo, sync-resultados passa a rodar sozinho
--
-- Motivo: sync-ao-vivo só atualizava o placar PARCIAL (jogo em andamento), mas
-- o app nunca exibe esse placar parcial na tela (MatchCard mostra só um badge
-- "ao vivo / aguardando placar" enquanto finished = false). Na prática,
-- sync-ao-vivo só servia pra pegar o FINISHED um pouco mais rápido que o
-- sync-resultados — e ainda dependia de sync-resultados já ter rodado com
-- sucesso pra existir external_id, criando uma fragilidade desnecessária.
-- sync-resultados é auto-suficiente (cria/vincula E fecha o placar final),
-- então rodar só ele, com mais frequência, resolve sem perda de funcionalidade.
-- ============================================================================

select cron.unschedule('sync-ao-vivo-copa')
where exists (select 1 from cron.job where jobname = 'sync-ao-vivo-copa');

select cron.unschedule('sync-resultados-copa')
where exists (select 1 from cron.job where jobname = 'sync-resultados-copa');

select cron.schedule(
  'sync-resultados-copa',
  '*/2 * * * *',
  $$
  select net.http_post(
    url     := 'https://qrxzbvvnjuunuzfvmqee.supabase.co/functions/v1/sync-resultados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- Conferir o agendamento:  select * from cron.job;
-- Ver os últimos syncs:    select * from sync_logs order by created_at desc limit 20;
