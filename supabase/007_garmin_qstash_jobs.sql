create table if not exists public.garmin_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.garmin_connections(id) on delete cascade,
  sync_type text not null,
  status text not null default 'QUEUED',
  window_start date not null,
  window_end date not null,
  backfill_cutoff date,
  deduplication_key text not null unique,
  qstash_message_id text,
  attempt_count integer not null default 0,
  last_error_code text,
  sanitized_error_message text,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists garmin_sync_jobs_dispatch_idx
  on public.garmin_sync_jobs (status, available_at, created_at);
create index if not exists garmin_sync_jobs_connection_idx
  on public.garmin_sync_jobs (connection_id, created_at desc);

drop trigger if exists set_garmin_sync_jobs_updated_at on public.garmin_sync_jobs;
create trigger set_garmin_sync_jobs_updated_at
  before update on public.garmin_sync_jobs
  for each row execute function public.set_updated_at();

alter table public.garmin_sync_jobs enable row level security;
alter table public.garmin_sync_jobs force row level security;
grant select on public.garmin_sync_jobs to authenticated;

drop policy if exists "Users can read own garmin sync jobs" on public.garmin_sync_jobs;
create policy "Users can read own garmin sync jobs"
  on public.garmin_sync_jobs for select to authenticated
  using ((select auth.uid()) = user_id);

