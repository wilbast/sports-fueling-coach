create table if not exists public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_states_updated_at on public.app_states;

create trigger set_app_states_updated_at
before update on public.app_states
for each row
execute function public.set_updated_at();

alter table public.app_states enable row level security;
alter table public.app_states force row level security;

grant select, insert, update, delete on public.app_states to authenticated;

drop policy if exists "Users can read their own app state" on public.app_states;
drop policy if exists "Users can insert their own app state" on public.app_states;
drop policy if exists "Users can update their own app state" on public.app_states;
drop policy if exists "Users can delete their own app state" on public.app_states;

create policy "Users can read their own app state"
on public.app_states
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users can insert their own app state"
on public.app_states
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users can update their own app state"
on public.app_states
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users can delete their own app state"
on public.app_states
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);
