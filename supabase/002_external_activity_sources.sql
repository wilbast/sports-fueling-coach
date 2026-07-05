create extension if not exists pgcrypto;

create table if not exists public.external_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text,
  provider_username text,
  status text not null default 'connected',
  scopes text[] not null default '{}'::text[],
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.external_source_tokens (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.external_connections(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  token_type text not null default 'Bearer',
  scopes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null,
  source_connection_id uuid references public.external_connections(id) on delete set null,
  source_activity_id text not null,
  name text not null,
  description text,
  sport_type text not null,
  workout_type text,
  start_date timestamptz not null,
  start_date_local timestamptz,
  timezone text,
  utc_offset integer,
  elapsed_time_seconds integer,
  moving_time_seconds integer,
  distance_meters double precision,
  elevation_gain_meters double precision,
  calories double precision,
  average_speed_mps double precision,
  max_speed_mps double precision,
  average_pace_seconds_per_km double precision,
  max_pace_seconds_per_km double precision,
  average_heartrate double precision,
  max_heartrate double precision,
  average_watts double precision,
  max_watts double precision,
  weighted_average_watts double precision,
  normalized_power double precision,
  average_cadence double precision,
  max_cadence double precision,
  relative_effort double precision,
  training_load double precision,
  temperature_celsius double precision,
  device_name text,
  gear_id text,
  gear_name text,
  is_private boolean not null default false,
  is_commute boolean not null default false,
  is_indoor boolean not null default false,
  is_manual boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_provider, source_activity_id)
);

create table if not exists public.activity_streams (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null,
  source_activity_id text not null,
  stream_type text not null,
  series jsonb not null,
  original_size integer,
  resolution text,
  created_at timestamptz not null default now(),
  unique (activity_id, stream_type)
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null,
  source_equipment_id text not null,
  name text,
  brand_name text,
  model_name text,
  distance_meters double precision,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_provider, source_equipment_id)
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  connection_id uuid references public.external_connections(id) on delete set null,
  sync_type text not null,
  status text not null default 'running',
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists external_connections_user_provider_idx
on public.external_connections (user_id, provider);

create index if not exists activities_user_provider_start_date_idx
on public.activities (user_id, source_provider, start_date desc);

create index if not exists activity_streams_user_activity_idx
on public.activity_streams (user_id, activity_id);

create index if not exists equipment_user_provider_idx
on public.equipment (user_id, source_provider);

create index if not exists sync_jobs_user_provider_started_idx
on public.sync_jobs (user_id, provider, started_at desc);

drop trigger if exists set_external_connections_updated_at on public.external_connections;
create trigger set_external_connections_updated_at
before update on public.external_connections
for each row
execute function public.set_updated_at();

drop trigger if exists set_external_source_tokens_updated_at on public.external_source_tokens;
create trigger set_external_source_tokens_updated_at
before update on public.external_source_tokens
for each row
execute function public.set_updated_at();

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
before update on public.activities
for each row
execute function public.set_updated_at();

drop trigger if exists set_equipment_updated_at on public.equipment;
create trigger set_equipment_updated_at
before update on public.equipment
for each row
execute function public.set_updated_at();

alter table public.external_connections enable row level security;
alter table public.external_connections force row level security;
alter table public.external_source_tokens enable row level security;
alter table public.external_source_tokens force row level security;
alter table public.activities enable row level security;
alter table public.activities force row level security;
alter table public.activity_streams enable row level security;
alter table public.activity_streams force row level security;
alter table public.equipment enable row level security;
alter table public.equipment force row level security;
alter table public.sync_jobs enable row level security;
alter table public.sync_jobs force row level security;

grant select on public.external_connections to authenticated;
grant select on public.activities to authenticated;
grant select on public.activity_streams to authenticated;
grant select on public.equipment to authenticated;
grant select on public.sync_jobs to authenticated;
revoke all on public.external_source_tokens from anon, authenticated;

drop policy if exists "Users can read own external connections" on public.external_connections;
create policy "Users can read own external connections"
on public.external_connections
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own activities" on public.activities;
create policy "Users can read own activities"
on public.activities
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own activity streams" on public.activity_streams;
create policy "Users can read own activity streams"
on public.activity_streams
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own equipment" on public.equipment;
create policy "Users can read own equipment"
on public.equipment
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own sync jobs" on public.sync_jobs;
create policy "Users can read own sync jobs"
on public.sync_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);
