-- Persiste o id numérico de time da BSD Football API (Libertadores/Copa do
-- Brasil), hoje usado só transitoriamente em sync-resultados-bsd para o
-- pareamento de ida/volta. Guardar em matches permite à UI resolver o escudo
-- real do clube via https://sports.bzzoiro.com/img/team/{id}/ em vez do
-- fallback genérico de bandeira (🏴) usado para todo time de clube.
--
-- Ficam NULL para jogos de Copa do Mundo/Champions League (sync via
-- football-data.org, que não expõe esse id) — sem impacto nesses torneios.
--
-- Cole este arquivo no Supabase Dashboard > SQL Editor > Run.

alter table matches add column if not exists home_team_id integer;
alter table matches add column if not exists away_team_id integer;
