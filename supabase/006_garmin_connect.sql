create extension if not exists pgcrypto;

create table if not exists public.garmin_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'garmin',
  encrypted_token_payload text,
  encrypted_provider_username_or_email text,
  connection_status text not null default 'DISCONNECTED',
  provider_display_name text,
  connected_at timestamptz,
  disconnected_at timestamptz,
  reauth_required_at timestamptz,
  last_auth_success_at timestamptz,
  last_auth_error_code text,
  last_sync_attempt_at timestamptz,
  last_successful_sync_at timestamptz,
  next_sync_after timestamptz,
  earliest_imported_date date,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.garmin_auth_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'garmin',
  status text not null default 'AUTHENTICATING',
  encrypted_email text not null,
  encrypted_password text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  error_code text,
  sanitized_error_message text,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.garmin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.garmin_connections(id) on delete set null,
  sync_type text not null,
  status text not null default 'QUEUED',
  trigger text not null default 'manual',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  heartbeat_at timestamptz,
  window_start date,
  window_end date,
  current_domain text,
  processed_domains text[] not null default '{}'::text[],
  successful_requests integer not null default 0,
  failed_requests integer not null default 0,
  created_records integer not null default 0,
  updated_records integer not null default 0,
  unchanged_records integer not null default 0,
  downloaded_files integer not null default 0,
  bytes_downloaded bigint not null default 0,
  retry_count integer not null default 0,
  error_code text,
  sanitized_error_message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garmin_sync_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.garmin_connections(id) on delete cascade,
  data_domain text not null,
  earliest_imported_date date,
  latest_successful_date date,
  last_cursor text,
  status text not null default 'pending',
  error_code text,
  sanitized_error_message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, connection_id, data_domain)
);

create table if not exists public.garmin_raw_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.garmin_connections(id) on delete set null,
  provider text not null default 'garmin',
  data_domain text not null,
  endpoint_key text not null,
  method_name text not null,
  schema_version integer not null default 1,
  provider_record_id text not null,
  record_date date,
  range_start date,
  range_end date,
  request_parameters_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null,
  payload_hash text not null,
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  sync_run_id uuid references public.garmin_sync_runs(id) on delete set null,
  is_current boolean not null default true,
  superseded_by_id uuid references public.garmin_raw_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, endpoint_key, provider_record_id, payload_hash)
);

create table if not exists public.garmin_activity_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  provider text not null default 'garmin',
  provider_activity_id text not null,
  file_type text not null,
  storage_key text,
  content_type text,
  file_size bigint,
  checksum text,
  downloaded_at timestamptz,
  sync_run_id uuid references public.garmin_sync_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_activity_id, file_type)
);

create table if not exists public.daily_health_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps integer,
  distance_m double precision,
  total_calories double precision,
  active_calories double precision,
  resting_calories double precision,
  floors double precision,
  moderate_intensity_minutes double precision,
  vigorous_intensity_minutes double precision,
  resting_heart_rate double precision,
  min_heart_rate double precision,
  max_heart_rate double precision,
  average_stress double precision,
  max_stress double precision,
  body_battery_start double precision,
  body_battery_end double precision,
  body_battery_high double precision,
  body_battery_low double precision,
  average_respiration double precision,
  spo2_average double precision,
  source text not null,
  source_record_id text,
  source_updated_at timestamptz,
  raw_record_id uuid references public.garmin_raw_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, date)
);

create table if not exists public.sleep_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  sleep_start timestamptz,
  sleep_end timestamptz,
  duration_seconds integer,
  deep_sleep_seconds integer,
  light_sleep_seconds integer,
  rem_sleep_seconds integer,
  awake_seconds integer,
  sleep_score double precision,
  average_stress double precision,
  average_respiration double precision,
  average_spo2 double precision,
  average_hrv double precision,
  source text not null,
  source_record_id text,
  source_updated_at timestamptz,
  raw_record_id uuid references public.garmin_raw_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, sleep_date)
);

create table if not exists public.hrv_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  nightly_average double precision,
  weekly_average double precision,
  baseline_low double precision,
  baseline_high double precision,
  status text,
  source text not null,
  source_record_id text,
  source_updated_at timestamptz,
  raw_record_id uuid references public.garmin_raw_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, date)
);

create table if not exists public.recovery_training_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  training_readiness double precision,
  recovery_time_seconds integer,
  training_status text,
  acute_load double precision,
  load_ratio double precision,
  load_focus_json jsonb,
  vo2max_running double precision,
  vo2max_cycling double precision,
  lactate_threshold_heart_rate double precision,
  lactate_threshold_pace text,
  ftp double precision,
  race_predictions_json jsonb,
  endurance_score double precision,
  hill_score double precision,
  heat_acclimation double precision,
  altitude_acclimation double precision,
  source text not null,
  source_record_id text,
  raw_record_id uuid references public.garmin_raw_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_record_id)
);

create index if not exists garmin_connections_user_provider_idx on public.garmin_connections (user_id, provider);
create index if not exists garmin_auth_attempts_user_status_idx on public.garmin_auth_attempts (user_id, status, expires_at desc);
create index if not exists garmin_sync_runs_user_started_idx on public.garmin_sync_runs (user_id, started_at desc);
create index if not exists garmin_raw_records_user_domain_date_idx on public.garmin_raw_records (user_id, data_domain, record_date desc);
create index if not exists daily_health_summaries_user_date_idx on public.daily_health_summaries (user_id, date desc);
create index if not exists sleep_summaries_user_date_idx on public.sleep_summaries (user_id, sleep_date desc);
create index if not exists hrv_summaries_user_date_idx on public.hrv_summaries (user_id, date desc);
create index if not exists recovery_training_states_user_measured_idx on public.recovery_training_states (user_id, measured_at desc);

drop trigger if exists set_garmin_connections_updated_at on public.garmin_connections;
create trigger set_garmin_connections_updated_at before update on public.garmin_connections for each row execute function public.set_updated_at();

drop trigger if exists set_garmin_sync_runs_updated_at on public.garmin_sync_runs;
create trigger set_garmin_sync_runs_updated_at before update on public.garmin_sync_runs for each row execute function public.set_updated_at();

drop trigger if exists set_garmin_sync_checkpoints_updated_at on public.garmin_sync_checkpoints;
create trigger set_garmin_sync_checkpoints_updated_at before update on public.garmin_sync_checkpoints for each row execute function public.set_updated_at();

drop trigger if exists set_garmin_raw_records_updated_at on public.garmin_raw_records;
create trigger set_garmin_raw_records_updated_at before update on public.garmin_raw_records for each row execute function public.set_updated_at();

drop trigger if exists set_daily_health_summaries_updated_at on public.daily_health_summaries;
create trigger set_daily_health_summaries_updated_at before update on public.daily_health_summaries for each row execute function public.set_updated_at();

drop trigger if exists set_sleep_summaries_updated_at on public.sleep_summaries;
create trigger set_sleep_summaries_updated_at before update on public.sleep_summaries for each row execute function public.set_updated_at();

drop trigger if exists set_hrv_summaries_updated_at on public.hrv_summaries;
create trigger set_hrv_summaries_updated_at before update on public.hrv_summaries for each row execute function public.set_updated_at();

drop trigger if exists set_recovery_training_states_updated_at on public.recovery_training_states;
create trigger set_recovery_training_states_updated_at before update on public.recovery_training_states for each row execute function public.set_updated_at();

alter table public.garmin_connections enable row level security;
alter table public.garmin_connections force row level security;
alter table public.garmin_auth_attempts enable row level security;
alter table public.garmin_auth_attempts force row level security;
alter table public.garmin_sync_runs enable row level security;
alter table public.garmin_sync_runs force row level security;
alter table public.garmin_sync_checkpoints enable row level security;
alter table public.garmin_sync_checkpoints force row level security;
alter table public.garmin_raw_records enable row level security;
alter table public.garmin_raw_records force row level security;
alter table public.garmin_activity_files enable row level security;
alter table public.garmin_activity_files force row level security;
alter table public.daily_health_summaries enable row level security;
alter table public.daily_health_summaries force row level security;
alter table public.sleep_summaries enable row level security;
alter table public.sleep_summaries force row level security;
alter table public.hrv_summaries enable row level security;
alter table public.hrv_summaries force row level security;
alter table public.recovery_training_states enable row level security;
alter table public.recovery_training_states force row level security;

grant select on public.garmin_connections to authenticated;
grant select on public.garmin_sync_runs to authenticated;
grant select on public.garmin_sync_checkpoints to authenticated;
grant select on public.daily_health_summaries to authenticated;
grant select on public.sleep_summaries to authenticated;
grant select on public.hrv_summaries to authenticated;
grant select on public.recovery_training_states to authenticated;
revoke all on public.garmin_auth_attempts from anon, authenticated;
revoke all on public.garmin_raw_records from anon, authenticated;
revoke all on public.garmin_activity_files from anon, authenticated;

drop policy if exists "Users can read own garmin connections" on public.garmin_connections;
create policy "Users can read own garmin connections" on public.garmin_connections for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own garmin sync runs" on public.garmin_sync_runs;
create policy "Users can read own garmin sync runs" on public.garmin_sync_runs for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own garmin sync checkpoints" on public.garmin_sync_checkpoints;
create policy "Users can read own garmin sync checkpoints" on public.garmin_sync_checkpoints for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own daily health summaries" on public.daily_health_summaries;
create policy "Users can read own daily health summaries" on public.daily_health_summaries for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own sleep summaries" on public.sleep_summaries;
create policy "Users can read own sleep summaries" on public.sleep_summaries for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own hrv summaries" on public.hrv_summaries;
create policy "Users can read own hrv summaries" on public.hrv_summaries for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own recovery training states" on public.recovery_training_states;
create policy "Users can read own recovery training states" on public.recovery_training_states for select to authenticated using ((select auth.uid()) = user_id);
