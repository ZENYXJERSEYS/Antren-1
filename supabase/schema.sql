-- ============================================================================
-- Antren — Supabase schema
-- Run this whole file in the Supabase SQL Editor (Dashboard → SQL → New query)
-- BEFORE running the data import. It is idempotent-safe to re-run.
-- ============================================================================

create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- opportunities — the 200k+ catalog
-- ----------------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  title text not null default '',
  subtitle text not null default '',
  description text not null default '',
  short_description text not null default '',
  provider text not null default '',
  official_url text not null default '',
  category text not null default '',
  sub_fields jsonb not null default '[]',
  location text not null default '',
  country text not null default '',
  remote boolean not null default false,
  eligibility text not null default '',
  grade_eligibility jsonb not null default '[]',
  college_only boolean not null default false,
  is_free boolean not null default true,
  cost numeric,
  currency text not null default 'USD',
  stipend_text text not null default '',
  deadline bigint not null default 0,
  rolling_deadline boolean not null default false,
  duration text not null default '',
  application_method text not null default '',
  required_documents jsonb not null default '[]',
  verification_status text not null default 'unverified',
  last_verified_at bigint,
  verification_note text not null default '',
  status text not null default 'published',
  media jsonb not null default '[]',
  tags jsonb not null default '[]',
  featured boolean not null default false,
  is_new boolean not null default false,
  views bigint not null default 0,
  created_at bigint not null,
  updated_at bigint not null,
  search_text text not null default ''
);

create index if not exists opportunities_status_idx on public.opportunities (status, deadline);
create index if not exists opportunities_category_idx on public.opportunities (category, deadline);
create index if not exists opportunities_country_idx on public.opportunities (country);
create index if not exists opportunities_verification_idx on public.opportunities (verification_status);
create index if not exists opportunities_deadline_idx on public.opportunities (deadline);
create index if not exists opportunities_featured_idx on public.opportunities (featured) where featured;
create index if not exists opportunities_search_trgm_idx on public.opportunities using gin (search_text gin_trgm_ops);
create index if not exists opportunities_title_trgm_idx on public.opportunities using gin (title gin_trgm_ops);

alter table public.opportunities enable row level security;
-- The catalog is public read-only; writes happen via the service role (imports)
-- or the security-definer helpers below.
drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select using (true);

-- ----------------------------------------------------------------------------
-- profiles — one per auth user (id = auth.users.id)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  grade text not null default '',
  town text not null default '',
  country text not null default 'Global',
  location_public boolean not null default false,
  bio text not null default '',
  socials jsonb not null default '{}',
  interests jsonb not null default '[]',
  sub_fields jsonb not null default '[]',
  theme text not null default 'light',
  accent_color text,
  public_profile boolean not null default true,
  onboarding_complete boolean not null default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select using (public_profile = true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- saved_opportunities
-- ----------------------------------------------------------------------------
create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  saved_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (user_id, opportunity_id)
);

alter table public.saved_opportunities enable row level security;
drop policy if exists saved_select on public.saved_opportunities;
create policy saved_select on public.saved_opportunities
  for select using (auth.uid() = user_id);
drop policy if exists saved_insert on public.saved_opportunities;
create policy saved_insert on public.saved_opportunities
  for insert with check (auth.uid() = user_id);
drop policy if exists saved_delete on public.saved_opportunities;
create policy saved_delete on public.saved_opportunities
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- applications — the pipeline
-- ----------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status text not null default 'saved',
  notes text,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (user_id, opportunity_id)
);

alter table public.applications enable row level security;
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (auth.uid() = user_id);
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert with check (auth.uid() = user_id);
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- connections — peer graph
-- ----------------------------------------------------------------------------
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  responded_at bigint
);

alter table public.connections enable row level security;
drop policy if exists connections_select on public.connections;
create policy connections_select on public.connections
  for select using (auth.uid() in (from_user_id, to_user_id));
drop policy if exists connections_insert on public.connections;
create policy connections_insert on public.connections
  for insert with check (auth.uid() = from_user_id);
drop policy if exists connections_update on public.connections;
create policy connections_update on public.connections
  for update using (auth.uid() in (from_user_id, to_user_id))
  with check (auth.uid() in (from_user_id, to_user_id));

-- ----------------------------------------------------------------------------
-- messages
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  read_at bigint
);

alter table public.messages enable row level security;
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.from_user_id, c.to_user_id)
    )
  );
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.from_user_id, c.to_user_id)
    )
  );
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.from_user_id, c.to_user_id)
    )
  );

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'system',
  title text not null default '',
  body text not null default '',
  href text not null default '',
  read boolean not null default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (auth.uid() = user_id);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- opportunity_views / search_queries
-- ----------------------------------------------------------------------------
create table if not exists public.opportunity_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  viewed_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.opportunity_views enable row level security;
drop policy if exists views_select on public.opportunity_views;
create policy views_select on public.opportunity_views
  for select using (auth.uid() = user_id);
drop policy if exists views_insert on public.opportunity_views;
create policy views_insert on public.opportunity_views
  for insert with check (auth.uid() = user_id);

create table if not exists public.search_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.search_queries enable row level security;
drop policy if exists search_queries_select on public.search_queries;
create policy search_queries_select on public.search_queries
  for select using (auth.uid() = user_id);
drop policy if exists search_queries_insert on public.search_queries;
create policy search_queries_insert on public.search_queries
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Helpers (security definer so public/anonymous clients can call them)
-- ----------------------------------------------------------------------------

-- Exact catalog aggregates for the landing page.
create or replace function public.antren_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'opportunities', (select count(*) from public.opportunities where status = 'published'),
    'verified', (select count(*) from public.opportunities where verification_status in ('verified', 'recently_verified')),
    'categories', (select count(distinct category) from public.opportunities),
    'countries', (select count(distinct country) from public.opportunities),
    'users', (select count(*) from public.profiles)
  );
$$;

revoke all on function public.antren_stats() from public;
grant execute on function public.antren_stats() to anon, authenticated;

-- Increment the view counter (client-safe; opportunities are otherwise read-only).
create or replace function public.antren_bump_views(opp_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.opportunities set views = views + 1 where id = opp_id;
$$;

revoke all on function public.antren_bump_views(uuid) from public;
grant execute on function public.antren_bump_views(uuid) to anon, authenticated;
