-- Trophy Tracker schema
-- Paste into Supabase: SQL Editor -> New query -> Run

-- 1. Games -------------------------------------------------------------------
create table if not exists public.games (
  id                    text primary key,
  user_id               uuid not null default auth.uid()
                          references auth.users(id) on delete cascade,
  rawg_id               integer,
  title                 text not null,
  platform              text not null check (platform in ('steam', 'ps5')),
  cover_image           text,
  -- The game's own lettering, laid over the art on a card. Resolved from
  -- SteamGridDB by title, or from Steam's CDN for a linked app; stored so the
  -- lookup happens once per game rather than once per render.
  logo_image            text,
  release_date          text,
  genres                text[] not null default '{}',
  hours_played          numeric not null default 0,
  rating                numeric not null default 0,
  achievement_rating    numeric not null default 0,
  achievements_unlocked integer not null default 0,
  achievements_total    integer not null default 0,
  collections           text[] not null default '{}',
  notes                 text,
  last_played_at        timestamptz,
  added_at              timestamptz not null default now(),
  completed_at          timestamptz,
  updated_at            timestamptz not null default now(),
  -- Platform links. Set when a game is matched to a store entry, which is what
  -- makes live data and auto-sync possible. Null on a hand-entered game.
  steam_appid           integer,
  psn_communication_id  text,
  psn_title_id          text,
  sync_source           text not null default 'manual'
                          check (sync_source in ('manual', 'steam', 'psn')),
  auto_sync             boolean not null default false,
  last_synced_at        timestamptz,
  -- When the most recent achievement or trophy was earned, as the platform
  -- reports it.
  last_unlocked_at      timestamptz
);
create index if not exists games_user_id_idx on public.games (user_id);

-- 2. Collections -------------------------------------------------------------
create table if not exists public.collections (
  id          text not null,
  user_id     uuid not null default auth.uid()
                references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  color       text,
  icon        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Per user, not global: the fixed starter ids have to be seedable on every
  -- account, and a global key let only the first one have them.
  primary key (user_id, id)
);
create index if not exists collections_user_id_idx on public.collections (user_id);

-- 3. Profile -----------------------------------------------------------------
--    platform_order and the sidebar config live here so Settings follows you
--    between devices instead of being stranded in one browser's local storage.
create table if not exists public.user_profile (
  user_id        uuid primary key default auth.uid()
                   references auth.users(id) on delete cascade,
  username       text not null default 'Player',
  email          text,
  avatar_url     text,
  sidebar_config jsonb,
  platform_order text[],
  highlight_style text,
  rating_mode    text,
  updated_at     timestamptz not null default now()
);

-- 3b. Linked platform accounts ------------------------------------------------
--     One row per user, holding what is needed to fetch live Steam and PSN
--     data. The PSN refresh token lives here rather than in the browser: the
--     edge function reads it with the service role, and the client never
--     selects that column.
create table if not exists public.platform_accounts (
  user_id              uuid primary key default auth.uid()
                         references auth.users(id) on delete cascade,
  steam_id             text,
  steam_persona        text,
  psn_account_id       text,
  psn_online_id        text,
  psn_refresh_token    text,
  psn_access_token     text,
  psn_token_expires_at timestamptz,
  updated_at           timestamptz not null default now()
);

alter table public.platform_accounts
  add column if not exists steam_id             text,
  add column if not exists steam_persona        text,
  add column if not exists psn_account_id       text,
  add column if not exists psn_online_id        text,
  add column if not exists psn_refresh_token    text,
  add column if not exists psn_access_token     text,
  add column if not exists psn_token_expires_at timestamptz,
  add column if not exists updated_at           timestamptz not null default now();

-- 4. Reconcile columns -------------------------------------------------------
--    "create table if not exists" leaves an EXISTING table completely alone, so
--    a project set up against an older version of this file silently keeps the
--    old columns and every write naming a newer one fails with 42703. Listing
--    each column again here makes re-running this script repair that drift
--    instead of quietly doing nothing.
alter table public.games
  add column if not exists rawg_id               integer,
  add column if not exists cover_image           text,
  add column if not exists logo_image            text,
  add column if not exists release_date          text,
  add column if not exists genres                text[] not null default '{}',
  add column if not exists hours_played          numeric not null default 0,
  add column if not exists rating                numeric not null default 0,
  add column if not exists achievement_rating    numeric not null default 0,
  add column if not exists achievements_unlocked integer not null default 0,
  add column if not exists achievements_total    integer not null default 0,
  add column if not exists collections           text[] not null default '{}',
  add column if not exists notes                 text,
  add column if not exists last_played_at        timestamptz,
  add column if not exists completed_at          timestamptz,
  add column if not exists updated_at            timestamptz not null default now(),
  add column if not exists steam_appid           integer,
  add column if not exists psn_communication_id  text,
  add column if not exists psn_title_id          text,
  add column if not exists sync_source           text not null default 'manual',
  add column if not exists auto_sync             boolean not null default false,
  add column if not exists last_synced_at        timestamptz,
  add column if not exists last_unlocked_at      timestamptz;

-- The CHECK is added separately: a table created before sync_source existed
-- gets the column from the statement above, but no constraint with it.
alter table public.games drop constraint if exists games_sync_source_check;
alter table public.games add constraint games_sync_source_check
  check (sync_source in ('manual', 'steam', 'psn'));

alter table public.collections
  add column if not exists description text,
  add column if not exists color       text,
  add column if not exists icon        text,
  add column if not exists updated_at  timestamptz not null default now();

alter table public.user_profile
  add column if not exists username        text not null default 'Player',
  add column if not exists email           text,
  add column if not exists avatar_url      text,
  add column if not exists sidebar_config  jsonb,
  add column if not exists platform_order  text[],
  add column if not exists highlight_style text,
  add column if not exists rating_mode     text,
  add column if not exists updated_at      timestamptz not null default now();

-- 5. Keep updated_at honest --------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at before update on public.games
  for each row execute function public.touch_updated_at();

drop trigger if exists collections_touch_updated_at on public.collections;
create trigger collections_touch_updated_at before update on public.collections
  for each row execute function public.touch_updated_at();

drop trigger if exists user_profile_touch_updated_at on public.user_profile;
create trigger user_profile_touch_updated_at before update on public.user_profile
  for each row execute function public.touch_updated_at();

drop trigger if exists platform_accounts_touch_updated_at on public.platform_accounts;
create trigger platform_accounts_touch_updated_at before update on public.platform_accounts
  for each row execute function public.touch_updated_at();

-- 6. Row level security ------------------------------------------------------
--    Note: "create policy if not exists" is not valid PostgreSQL, so each
--    policy is dropped first to make this script safe to re-run.
alter table public.games             enable row level security;
alter table public.collections       enable row level security;
alter table public.user_profile      enable row level security;
alter table public.platform_accounts enable row level security;

drop policy if exists "games are private" on public.games;
create policy "games are private" on public.games
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "collections are private" on public.collections;
create policy "collections are private" on public.collections
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profile is private" on public.user_profile;
create policy "profile is private" on public.user_profile
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "platform accounts are private" on public.platform_accounts;
create policy "platform accounts are private" on public.platform_accounts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. Collections as the only shelf model ---------------------------------------
--    Games used to carry a single-valued `status` column alongside the
--    many-to-many `collections` array, saying the same thing twice and
--    disagreeing in normal use. Collections won; the three shelves below are
--    permanent and mutually exclusive, everything else is an ordinary list.
--
--    Everything in this section is written to be re-runnable, so applying this
--    file to an existing project repairs it rather than failing.

-- 7a. Per-user primary key ----------------------------------------------------
--     `id text primary key` made collection ids globally unique rather than
--     unique per user, so the fixed starter ids could only ever be seeded once
--     across the whole project. On every account after the first the upsert's
--     ON CONFLICT targeted a row RLS makes invisible, the write failed, and the
--     app reported it as "could not load your library". Only fires when the
--     primary key is still the single-column one.
do $$
begin
  if exists (
    select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'collections'
       and c.contype = 'p'
       and array_length(c.conkey, 1) = 1
  ) then
    alter table public.collections drop constraint collections_pkey;
    alter table public.collections add constraint collections_pkey primary key (user_id, id);
  end if;
end
$$;

-- 7b. Every library filter is now a containment lookup ------------------------
create index if not exists games_collections_idx
  on public.games using gin (collections);

-- 7c. Seed the three permanent collections for every existing user ------------
insert into public.collections (id, user_id, name, description, color, icon, created_at)
select v.id, u.id, v.name, v.description, v.color, v.icon, now()
  from auth.users u
  cross join (values
    ('perm-backlog',  'Backlog',       'Games queued to play',   '#a5a5ad', 'Clock'),
    ('perm-playing',  'Playing',       'Games on the go',        '#4d9bf0', 'Gamepad2'),
    ('perm-complete', '100% Complete', 'Every award earned',     '#f2c14e', 'Trophy')
  ) as v(id, name, description, color, icon)
on conflict (user_id, id) do nothing;

-- 7d. Backfill membership from `status`, then drop the column -----------------
--     The column goes in this same script, so the backfill has to be SQL: a
--     client-side migration would arrive after the data was already gone. Run
--     the whole block as one transaction — a partial run loses shelf
--     assignments with no way back.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'games' and column_name = 'status'
  ) then
    -- Shelves, in precedence order: actually being at 100% wins over whatever
    -- the game happened to be filed as.
    update public.games set collections =
      array_append(
        array_remove(array_remove(collections, 'col-backlog'), 'col-masterpieces'),
        'perm-complete')
      where not collections && array['perm-backlog','perm-playing','perm-complete']
        and (status = 'mastered'
             or (achievements_total > 0 and achievements_unlocked >= achievements_total));

    update public.games set collections =
      array_append(
        array_remove(array_remove(collections, 'col-backlog'), 'col-masterpieces'),
        'perm-playing')
      where not collections && array['perm-backlog','perm-playing','perm-complete']
        and status = 'playing';

    update public.games set collections =
      array_append(
        array_remove(array_remove(collections, 'col-backlog'), 'col-masterpieces'),
        'perm-backlog')
      where not collections && array['perm-backlog','perm-playing','perm-complete']
        and (status = 'backlog' or collections @> array['col-backlog']);

    -- The two statuses that become ordinary, deletable lists. Inserted only for
    -- users who actually have such games, so a clean account grows no empty
    -- tabs for shelves it never used.
    insert into public.collections (id, user_id, name, description, color, icon, created_at)
    select 'col-completed', g.user_id, 'Completed', 'Games you finished', '#52c294', 'Flag', now()
      from public.games g where g.status = 'completed'
     group by g.user_id
    on conflict (user_id, id) do nothing;

    insert into public.collections (id, user_id, name, description, color, icon, created_at)
    select 'col-dropped', g.user_id, 'Dropped', 'Games you stopped playing', '#c8c8cf', 'CircleSlash', now()
      from public.games g where g.status = 'dropped'
     group by g.user_id
    on conflict (user_id, id) do nothing;

    update public.games set collections = array_append(collections, 'col-completed')
     where status = 'completed' and not collections @> array['col-completed'];

    update public.games set collections = array_append(collections, 'col-dropped')
     where status = 'dropped' and not collections @> array['col-dropped'];

    -- The legacy duplicates of two of the shelves. Their members were merged
    -- above, so the rows themselves can go.
    delete from public.collections where id in ('col-backlog', 'col-masterpieces');

    alter table public.games drop constraint if exists games_status_check;
    alter table public.games drop column status;
  end if;
end
$$;

-- 7e. Retired columns ---------------------------------------------------------
--     `is_system` is gone because permanence is derived from a fixed id set in
--     the client rather than stored: a stored flag can be wrong, a set lookup
--     cannot. `status_names` went with the statuses it named.
alter table public.user_profile drop column if exists status_names;
alter table public.collections  drop column if exists is_system;
