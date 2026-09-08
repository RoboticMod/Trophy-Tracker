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
  status                text not null
                          check (status in ('backlog', 'playing', 'completed', 'mastered', 'dropped')),
  cover_image           text,
  release_date          text,
  genres                text[] not null default '{}',
  hours_played          numeric not null default 0,
  rating                numeric not null default 0,
  achievements_unlocked integer not null default 0,
  achievements_total    integer not null default 0,
  collections           text[] not null default '{}',
  notes                 text,
  last_played_at        timestamptz,
  added_at              timestamptz not null default now(),
  completed_at          timestamptz,
  updated_at            timestamptz not null default now()
);
create index if not exists games_user_id_idx on public.games (user_id);

-- 2. Collections -------------------------------------------------------------
create table if not exists public.collections (
  id          text primary key,
  user_id     uuid not null default auth.uid()
                references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  color       text,
  icon        text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists collections_user_id_idx on public.collections (user_id);

-- 3. Profile -----------------------------------------------------------------
--    status_names and platform_order live here so Settings follows you between
--    devices instead of being stranded in one browser's local storage.
create table if not exists public.user_profile (
  user_id        uuid primary key default auth.uid()
                   references auth.users(id) on delete cascade,
  username       text not null default 'Player',
  email          text,
  avatar_url     text,
  sidebar_config jsonb,
  status_names   jsonb,
  platform_order text[],
  highlight_style text,
  updated_at     timestamptz not null default now()
);

-- 4. Keep updated_at honest --------------------------------------------------
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

-- 5. Row level security ------------------------------------------------------
--    Note: "create policy if not exists" is not valid PostgreSQL, so each
--    policy is dropped first to make this script safe to re-run.
alter table public.games        enable row level security;
alter table public.collections  enable row level security;
alter table public.user_profile enable row level security;

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
