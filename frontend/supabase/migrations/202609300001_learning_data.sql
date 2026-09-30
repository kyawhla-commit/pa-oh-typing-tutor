-- User-owned Typing Tutor learning data. Apply this migration before enabling cloud sync.
create table if not exists public.learner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Learner' check (char_length(display_name) between 1 and 48),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dark_mode boolean not null default false,
  sounds boolean not null default true,
  target_wpm integer not null default 100 check (target_wpm between 20 and 200),
  daily_goal integer not null default 600 check (daily_goal between 100 and 2000),
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  keyboard_layout text not null default 'QWERTY' check (keyboard_layout in ('QWERTY', 'Pa''O')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null check (mode in ('practice', 'test')),
  label text,
  wpm numeric(7, 2) not null check (wpm >= 0),
  accuracy numeric(5, 2) not null check (accuracy between 0 and 100),
  characters integer not null check (characters >= 0),
  errors integer not null check (errors >= 0),
  duration_seconds integer not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_created_idx
  on public.practice_sessions (user_id, created_at desc);

create table if not exists public.completed_lessons (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id integer not null check (lesson_id > 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create or replace function public.set_learning_data_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.set_learning_data_updated_at() from public, anon, authenticated;

drop trigger if exists learner_profiles_updated_at on public.learner_profiles;
create trigger learner_profiles_updated_at before update on public.learner_profiles
  for each row execute function public.set_learning_data_updated_at();
drop trigger if exists learning_preferences_updated_at on public.learning_preferences;
create trigger learning_preferences_updated_at before update on public.learning_preferences
  for each row execute function public.set_learning_data_updated_at();

alter table public.learner_profiles enable row level security;
alter table public.learning_preferences enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.completed_lessons enable row level security;

revoke all on public.learner_profiles, public.learning_preferences,
  public.practice_sessions, public.completed_lessons from anon, authenticated;
grant select, insert, update, delete on public.learner_profiles,
  public.learning_preferences, public.practice_sessions,
  public.completed_lessons to authenticated;

drop policy if exists "Learners manage their own profile" on public.learner_profiles;
create policy "Learners manage their own profile"
  on public.learner_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners manage their own preferences" on public.learning_preferences;
create policy "Learners manage their own preferences"
  on public.learning_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners manage their own practice sessions" on public.practice_sessions;
create policy "Learners manage their own practice sessions"
  on public.practice_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners manage their own completed lessons" on public.completed_lessons;
create policy "Learners manage their own completed lessons"
  on public.completed_lessons for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
