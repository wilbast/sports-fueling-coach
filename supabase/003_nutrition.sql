create table if not exists public.standard_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  calories integer not null default 0,
  protein_grams double precision not null default 0,
  carbohydrate_grams double precision not null default 0,
  fat_grams double precision,
  source text not null default 'manual',
  confidence text not null default 'manual',
  estimate_rationale text,
  manually_confirmed boolean not null default false,
  tags text[] not null default '{}'::text[],
  raw_input text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  servings double precision not null default 1,
  total_calories integer not null default 0,
  total_protein_grams double precision not null default 0,
  total_carbohydrate_grams double precision not null default 0,
  total_fat_grams double precision,
  per_serving_calories integer not null default 0,
  per_serving_protein_grams double precision not null default 0,
  per_serving_carbohydrate_grams double precision not null default 0,
  per_serving_fat_grams double precision,
  source text not null default 'manual',
  confidence text not null default 'manual',
  estimate_rationale text,
  manually_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  amount_text text,
  calories integer,
  protein_grams double precision,
  carbohydrate_grams double precision,
  fat_grams double precision,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  logged_at timestamptz,
  time_label text,
  name text not null,
  description text,
  source text not null default 'free_text',
  source_id uuid,
  calories integer not null default 0,
  protein_grams double precision not null default 0,
  carbohydrate_grams double precision not null default 0,
  fat_grams double precision,
  confidence text not null default 'medium',
  estimate_rationale text,
  manually_confirmed boolean not null default false,
  raw_input text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  meal_log_id uuid references public.meal_logs(id) on delete set null,
  standard_meal_id uuid references public.standard_meals(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  calories_min integer,
  calories_max integer,
  calories integer not null default 0,
  protein_grams double precision not null default 0,
  carbohydrate_grams double precision not null default 0,
  fat_grams double precision,
  confidence text not null default 'medium',
  rationale text,
  provider text,
  model text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists meal_logs_user_date_idx
on public.meal_logs (user_id, logged_date, created_at);

create index if not exists standard_meals_user_name_idx
on public.standard_meals (user_id, name);

create index if not exists recipes_user_name_idx
on public.recipes (user_id, name);

create index if not exists nutrition_estimates_user_created_idx
on public.nutrition_estimates (user_id, created_at desc);

drop trigger if exists set_standard_meals_updated_at on public.standard_meals;
create trigger set_standard_meals_updated_at
before update on public.standard_meals
for each row
execute function public.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

drop trigger if exists set_meal_logs_updated_at on public.meal_logs;
create trigger set_meal_logs_updated_at
before update on public.meal_logs
for each row
execute function public.set_updated_at();

alter table public.standard_meals enable row level security;
alter table public.standard_meals force row level security;
alter table public.recipes enable row level security;
alter table public.recipes force row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredients force row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_logs force row level security;
alter table public.nutrition_estimates enable row level security;
alter table public.nutrition_estimates force row level security;

grant select, insert, update, delete on public.standard_meals to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.meal_logs to authenticated;
grant select, insert on public.nutrition_estimates to authenticated;

drop policy if exists "Users can manage own standard meals" on public.standard_meals;
create policy "Users can manage own standard meals"
on public.standard_meals
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recipes" on public.recipes;
create policy "Users can manage own recipes"
on public.recipes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recipe ingredients" on public.recipe_ingredients;
create policy "Users can manage own recipe ingredients"
on public.recipe_ingredients
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own meal logs" on public.meal_logs;
create policy "Users can manage own meal logs"
on public.meal_logs
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own nutrition estimates" on public.nutrition_estimates;
create policy "Users can read own nutrition estimates"
on public.nutrition_estimates
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own nutrition estimates" on public.nutrition_estimates;
create policy "Users can insert own nutrition estimates"
on public.nutrition_estimates
for insert
to authenticated
with check ((select auth.uid()) = user_id);
