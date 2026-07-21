-- supabase/schema.sql
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- this whole file -> Run.
--
-- Design: one row per workout day, with the exercises/sets stored as a
-- single jsonb blob rather than normalized into separate tables. For a
-- single-user app this is much simpler to sync (one upsert per save) and
-- the shape matches the WorkoutDay type in lib/types.ts exactly, so there's
-- no mapping layer between the app and the database.

create table if not exists workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  day_label text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists workout_days_user_date_idx
  on workout_days (user_id, date desc);

-- Row-level security: every user can only ever see or write their own rows.
alter table workout_days enable row level security;

drop policy if exists "Users can view their own workout days" on workout_days;
create policy "Users can view their own workout days"
  on workout_days for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workout days" on workout_days;
create policy "Users can insert their own workout days"
  on workout_days for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workout days" on workout_days;
create policy "Users can update their own workout days"
  on workout_days for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own workout days" on workout_days;
create policy "Users can delete their own workout days"
  on workout_days for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Daily Tasks
-- ---------------------------------------------------------------------------
-- One row per task. Recurring tasks store their recurrence rule once;
-- completion is tracked per-date in the separate task_completions table so a
-- recurring task can be checked off on Monday and still show up unchecked on
-- Tuesday, with full history preserved for the archive view.

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  recurrence text not null default 'once', -- 'once' | 'daily' | 'weekdays' (jsonb array of 0-6)
  recurrence_days jsonb, -- e.g. [1,2,3,4,5] for custom weekday selection
  start_date date not null default current_date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references daily_tasks (id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  unique (task_id, date)
);

create index if not exists task_completions_user_date_idx
  on task_completions (user_id, date desc);

alter table daily_tasks enable row level security;
alter table task_completions enable row level security;

drop policy if exists "Users manage their own tasks" on daily_tasks;
create policy "Users manage their own tasks"
  on daily_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own task completions" on task_completions;
create policy "Users manage their own task completions"
  on task_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Stats (weight + custom body measurements)
-- ---------------------------------------------------------------------------

create table if not exists stat_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  entry_type text not null, -- 'weight' | 'measurement'
  measurement_type text, -- e.g. 'Waist', 'Chest' — null when entry_type = 'weight'
  value numeric not null,
  unit text not null default 'lb',
  created_at timestamptz not null default now()
);

create index if not exists stat_entries_user_type_date_idx
  on stat_entries (user_id, entry_type, measurement_type, date desc);

alter table stat_entries enable row level security;

drop policy if exists "Users manage their own stat entries" on stat_entries;
create policy "Users manage their own stat entries"
  on stat_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Food Tracking
-- ---------------------------------------------------------------------------
-- food_items is the user's personal food library — populated by manual entry
-- or by saving an Open Food Facts search result. Nutrition is always stored
-- per the food's own serving (serving_qty + serving_unit), so logging a food
-- just multiplies by however many servings were eaten.
--
-- Meals and recipes both reference food_items via a junction table. Recipes
-- additionally store `servings`, so per-serving nutrition = (sum of
-- ingredient nutrition) / servings — calculated in the app, not the DB, so
-- it stays easy to eyeball and adjust.
--
-- food_logs is intentionally denormalized: each row snapshots the nutrition
-- values at the moment of logging. This keeps history accurate even if a
-- food's stored nutrition is edited later, and avoids re-joining three
-- tables just to render a day's log.

create table if not exists food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  serving_qty numeric not null default 1,
  serving_unit text not null default 'serving',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  fiber_g numeric not null default 0,
  sugar_g numeric not null default 0,
  fat_g numeric not null default 0,
  carbs_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  source text not null default 'manual', -- 'manual' | 'openfoodfacts'
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_id uuid not null references meals (id) on delete cascade,
  food_id uuid not null references food_items (id) on delete cascade,
  quantity numeric not null default 1
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  servings numeric not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references recipes (id) on delete cascade,
  food_id uuid not null references food_items (id) on delete cascade,
  quantity numeric not null default 1
);

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  entry_name text not null,
  quantity numeric not null default 1,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  fiber_g numeric not null default 0,
  sugar_g numeric not null default 0,
  fat_g numeric not null default 0,
  carbs_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  source_type text not null default 'food', -- 'food' | 'meal' | 'recipe'
  source_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_date_idx on food_logs (user_id, date desc);

-- Versioned goals: the row with the latest effective_date <= a given day is
-- that day's active goal, so editing goals today doesn't rewrite history.
create table if not exists nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_date date not null default current_date,
  calories numeric not null default 2000,
  protein_g numeric not null default 100,
  fiber_g numeric not null default 25
);

create index if not exists nutrition_goals_user_date_idx
  on nutrition_goals (user_id, effective_date desc);

alter table food_items enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table food_logs enable row level security;
alter table nutrition_goals enable row level security;

drop policy if exists "Users manage their own food items" on food_items;
create policy "Users manage their own food items"
  on food_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own meals" on meals;
create policy "Users manage their own meals"
  on meals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own meal items" on meal_items;
create policy "Users manage their own meal items"
  on meal_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own recipes" on recipes;
create policy "Users manage their own recipes"
  on recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own recipe ingredients" on recipe_ingredients;
create policy "Users manage their own recipe ingredients"
  on recipe_ingredients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own food logs" on food_logs;
create policy "Users manage their own food logs"
  on food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own nutrition goals" on nutrition_goals;
create policy "Users manage their own nutrition goals"
  on nutrition_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Fitness (Phase 3 restructure)
-- ---------------------------------------------------------------------------
-- Replaces the old fixed-program model (workout_days) with flexible logging
-- across categories. Exercise "types" are free text rather than a separate
-- lookup table — the app suggests a default list per category (Walking,
-- Pec Fly, etc.) and unions in whatever custom types the user has already
-- logged, the same pattern used for Stats measurement types. This keeps the
-- schema simple while still being fully extensible.
--
-- fitness_sets is separate from fitness_logs (one-to-many) since only
-- weightlifting needs multiple weight/rep pairs per entry; other categories
-- just use the fields directly on fitness_logs.

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workout_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null references workouts (id) on delete cascade,
  category text not null,
  type_name text not null,
  order_index int not null default 0
);

create table if not exists fitness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  category text not null, -- 'cardio' | 'weightlifting' | 'yoga' | 'swimming' | 'stretching'
  type_name text not null,
  distance numeric,
  duration_minutes numeric,
  seat_number text,
  machine_settings text,
  notes text,
  workout_id uuid references workouts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists fitness_logs_user_date_idx on fitness_logs (user_id, date desc);
create index if not exists fitness_logs_user_type_idx
  on fitness_logs (user_id, category, type_name, date desc);

create table if not exists fitness_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fitness_log_id uuid not null references fitness_logs (id) on delete cascade,
  set_number int not null,
  weight numeric,
  reps numeric
);

alter table workouts enable row level security;
alter table workout_items enable row level security;
alter table fitness_logs enable row level security;
alter table fitness_sets enable row level security;

drop policy if exists "Users manage their own workouts" on workouts;
create policy "Users manage their own workouts"
  on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own workout items" on workout_items;
create policy "Users manage their own workout items"
  on workout_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own fitness logs" on fitness_logs;
create policy "Users manage their own fitness logs"
  on fitness_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own fitness sets" on fitness_sets;
create policy "Users manage their own fitness sets"
  on fitness_sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- User settings (currently just the Stats reminder preference)
-- ---------------------------------------------------------------------------

create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stats_reminder_frequency text not null default 'off', -- 'off' | 'daily' | 'weekly'
  rest_timer_default_seconds int not null default 60
);

alter table user_settings enable row level security;

drop policy if exists "Users manage their own settings" on user_settings;
create policy "Users manage their own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- In case user_settings already existed from before this column was added.
alter table user_settings add column if not exists rest_timer_default_seconds int not null default 60;
alter table user_settings add column if not exists distance_unit_default text not null default 'mi'; -- 'mi' | 'km'

-- ---------------------------------------------------------------------------
-- Food Tracking additions: meal slot + per-entry notes
-- ---------------------------------------------------------------------------

alter table food_logs add column if not exists meal_slot text not null default 'other';
-- meal_slot: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack'
--          | 'dinner' | 'evening_snack' | 'other'
alter table food_logs add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- Fitness: optional photo per activity
-- ---------------------------------------------------------------------------

alter table fitness_logs add column if not exists image_url text;
alter table fitness_logs add column if not exists distance_unit text not null default 'mi'; -- 'mi' | 'km'

-- Storage bucket for activity photos. Public bucket (read is unrestricted)
-- since this is a single-user app and photo URLs aren't guessable/listed
-- anywhere public; writes/deletes are still locked to the owning user via
-- the policies below, keyed off a `<user_id>/...` path prefix.
insert into storage.buckets (id, name, public)
values ('activity-images', 'activity-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own activity images" on storage.objects;
create policy "Users can upload their own activity images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Anyone can view activity images" on storage.objects;
create policy "Anyone can view activity images"
  on storage.objects for select
  using (bucket_id = 'activity-images');

drop policy if exists "Users can delete their own activity images" on storage.objects;
create policy "Users can delete their own activity images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Extras: free-form daily notes + user-defined custom trackers
-- ---------------------------------------------------------------------------
-- extra_types is a user-defined "category" of thing to track (e.g. "Mood",
-- "Migraines", "Reading") with an emoji that then shows up on the Home
-- calendar for any day with a logged entry of that type — same visual
-- pattern as the built-in fitness/food emoji, just user-extensible.

create table if not exists day_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  notes text not null,
  created_at timestamptz not null default now()
);

create index if not exists day_notes_user_date_idx on day_notes (user_id, date desc);

create table if not exists extra_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '\u2b50',
  created_at timestamptz not null default now()
);

create table if not exists extra_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type_id uuid not null references extra_types (id) on delete cascade,
  date date not null default current_date,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists extra_records_user_date_idx on extra_records (user_id, date desc);
create index if not exists extra_records_user_type_idx on extra_records (user_id, type_id, date desc);

alter table day_notes enable row level security;
alter table extra_types enable row level security;
alter table extra_records enable row level security;

drop policy if exists "Users manage their own day notes" on day_notes;
create policy "Users manage their own day notes"
  on day_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own extra types" on extra_types;
create policy "Users manage their own extra types"
  on extra_types for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own extra records" on extra_records;
create policy "Users manage their own extra records"
  on extra_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
