create table if not exists public.training_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null,
  source_connection_id uuid references public.external_connections(id) on delete set null,
  zone_type text not null,
  sport_type text,
  custom_zones boolean,
  zones jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_provider, zone_type)
);

create table if not exists public.activity_zones (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null,
  source_activity_id text not null,
  zone_type text not null,
  score double precision,
  sensor_based boolean,
  custom_zones boolean,
  points integer,
  distribution_buckets jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, zone_type)
);

create index if not exists training_zones_user_provider_idx
on public.training_zones (user_id, source_provider);

create index if not exists activity_zones_user_activity_idx
on public.activity_zones (user_id, activity_id);

drop trigger if exists set_training_zones_updated_at on public.training_zones;
create trigger set_training_zones_updated_at
before update on public.training_zones
for each row
execute function public.set_updated_at();

drop trigger if exists set_activity_zones_updated_at on public.activity_zones;
create trigger set_activity_zones_updated_at
before update on public.activity_zones
for each row
execute function public.set_updated_at();

alter table public.training_zones enable row level security;
alter table public.training_zones force row level security;
alter table public.activity_zones enable row level security;
alter table public.activity_zones force row level security;

grant select on public.training_zones to authenticated;
grant select on public.activity_zones to authenticated;

drop policy if exists "Users can read own training zones" on public.training_zones;
create policy "Users can read own training zones"
on public.training_zones
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own activity zones" on public.activity_zones;
create policy "Users can read own activity zones"
on public.activity_zones
for select
to authenticated
using ((select auth.uid()) = user_id);
