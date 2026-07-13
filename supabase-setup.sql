-- =============================================================================
-- ZALAR FARMS CHALLENGE — Script de mise en place Supabase
-- -----------------------------------------------------------------------------
-- COMMENT L'UTILISER (aucune connaissance requise) :
--   1. Console Supabase → ton projet → "SQL Editor" (menu de gauche)
--   2. "New query", colle TOUT ce fichier, clique "Run".
--   3. C'est fini. Tu ne toucheras plus jamais à ça.
-- Ce script est "idempotent" : tu peux le relancer sans rien casser.
-- =============================================================================

-- ---------- Tables ----------
create table if not exists public.game (
  id          int primary key default 1,
  phase       text not null default 'lobby',   -- lobby | video | question | reveal | podium
  q_index     int  not null default -1,
  round       int  not null default 0,
  started_at  timestamptz,
  video_kind  text,                            -- intro | transition | outro
  video_src   text,
  updated_at  timestamptz not null default now()
);
insert into public.game (id) values (1) on conflict (id) do nothing;

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  initials   text,
  score      int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id         bigint generated always as identity primary key,
  player_id  uuid references public.players(id) on delete cascade,
  round      int not null,
  q_index    int not null,
  choice     int,
  correct    boolean,
  points     int not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, round, q_index)
);

-- ---------- Temps réel (l'animateur écoute les changements) ----------
alter publication supabase_realtime add table public.game;
alter publication supabase_realtime add table public.players;

-- ---------- Sécurité (accès public pour un événement ponctuel) ----------
alter table public.game    enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

drop policy if exists p_game_all    on public.game;
drop policy if exists p_players_all on public.players;
drop policy if exists p_answers_all on public.answers;
create policy p_game_all    on public.game    for all using (true) with check (true);
create policy p_players_all on public.players for all using (true) with check (true);
create policy p_answers_all on public.answers for all using (true) with check (true);

-- ---------- Fonctions ----------
-- Heure serveur (pour synchroniser les 200 timers)
create or replace function public.server_now()
returns timestamptz language sql stable as $$ select now() $$;

-- Enregistre UNE réponse (anti double-réponse) et incrémente le score une seule fois
create or replace function public.submit_answer(
  p_player uuid, p_round int, p_q int, p_choice int, p_correct boolean, p_points int
) returns void language plpgsql as $$
begin
  insert into public.answers (player_id, round, q_index, choice, correct, points)
  values (p_player, p_round, p_q, p_choice, p_correct, p_points)
  on conflict (player_id, round, q_index) do nothing;
  if found then
    update public.players set score = score + p_points where id = p_player;
  end if;
end $$;

-- Remet les scores à zéro (nouvelle partie)
create or replace function public.reset_scores()
returns void language plpgsql as $$
begin
  update public.players set score = 0;
  delete from public.answers;
end $$;

-- Droits d'exécution pour le rôle public (anon)
grant execute on function public.server_now()   to anon, authenticated;
grant execute on function public.submit_answer(uuid,int,int,int,boolean,int) to anon, authenticated;
grant execute on function public.reset_scores()  to anon, authenticated;
