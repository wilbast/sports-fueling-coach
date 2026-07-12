create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg double precision,
  bmi double precision,
  body_fat_percent double precision,
  body_water_percent double precision,
  muscle_mass_kg double precision,
  bone_mass_kg double precision,
  visceral_fat double precision,
  metabolic_age double precision,
  basal_metabolic_rate double precision,
  physique_rating text,
  source text not null,
  source_record_id text not null,
  raw_record_id uuid references public.garmin_raw_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_record_id)
);

create index if not exists body_measurements_user_measured_idx
  on public.body_measurements (user_id, measured_at desc);

drop trigger if exists set_body_measurements_updated_at on public.body_measurements;
create trigger set_body_measurements_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

alter table public.body_measurements enable row level security;
alter table public.body_measurements force row level security;
grant select on public.body_measurements to authenticated;

drop policy if exists "Users can read own body measurements" on public.body_measurements;
create policy "Users can read own body measurements"
  on public.body_measurements for select to authenticated
  using ((select auth.uid()) = user_id);

