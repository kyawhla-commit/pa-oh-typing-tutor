-- Learners explicitly opt in before any profile or score appears publicly.
create table if not exists public.leaderboard_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 32),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_leaderboard_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.set_leaderboard_profile_updated_at() from public, anon, authenticated;

drop trigger if exists leaderboard_profiles_updated_at on public.leaderboard_profiles;
create trigger leaderboard_profiles_updated_at
  before update on public.leaderboard_profiles
  for each row execute function public.set_leaderboard_profile_updated_at();

alter table public.leaderboard_profiles enable row level security;
revoke all on public.leaderboard_profiles from anon, authenticated;
grant select, insert, update on public.leaderboard_profiles to authenticated;

drop policy if exists "Learners manage their own leaderboard profile" on public.leaderboard_profiles;
create policy "Learners manage their own leaderboard profile"
  on public.leaderboard_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Expose only opted-in aggregate stats. Never return email, auth user ID, or session rows.
create or replace function public.get_public_leaderboard(
  p_period text default 'all',
  p_sort text default 'speed'
)
returns table (
  rank integer,
  display_name text,
  best_wpm numeric,
  average_accuracy numeric,
  test_count bigint,
  level integer,
  is_you boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with options as (
    select
      case when p_period in ('all', 'week', 'month') then p_period else 'all' end as period,
      case when p_sort in ('speed', 'accuracy') then p_sort else 'speed' end as sort_by
  ),
  bounds as (
    select case options.period
      when 'week' then pg_catalog.date_trunc('week', pg_catalog.timezone('UTC', pg_catalog.now())) at time zone 'UTC'
      when 'month' then pg_catalog.date_trunc('month', pg_catalog.timezone('UTC', pg_catalog.now())) at time zone 'UTC'
      else null
    end as starts_at
    from options
  ),
  scores as (
    select
      profile.user_id,
      profile.display_name,
      pg_catalog.max(session.wpm) as best_wpm,
      pg_catalog.round(pg_catalog.avg(session.accuracy), 2) as average_accuracy,
      pg_catalog.count(*) as test_count,
      (select pg_catalog.count(*)::integer
       from public.completed_lessons lesson
       where lesson.user_id = profile.user_id) as completed_lessons,
      options.sort_by
    from public.leaderboard_profiles profile
    join public.practice_sessions session on session.user_id = profile.user_id
    cross join options
    cross join bounds
    where profile.is_public
      and session.mode = 'test'
      and (bounds.starts_at is null or session.created_at >= bounds.starts_at)
    group by profile.user_id, profile.display_name, options.sort_by
  ),
  ranked as (
    select
      pg_catalog.row_number() over (
        order by
          case when scores.sort_by = 'speed' then scores.best_wpm end desc nulls last,
          case when scores.sort_by = 'accuracy' then scores.average_accuracy end desc nulls last,
          case when scores.sort_by = 'speed' then scores.average_accuracy end desc nulls last,
          case when scores.sort_by = 'accuracy' then scores.best_wpm end desc nulls last,
          scores.display_name asc,
          scores.user_id asc
      )::integer as position,
      scores.*
    from scores
  )
  select
    ranked.position,
    ranked.display_name,
    ranked.best_wpm,
    ranked.average_accuracy,
    ranked.test_count,
    (ranked.completed_lessons / 3) + 1,
    coalesce(ranked.user_id = auth.uid(), false)
  from ranked
  where ranked.position <= 100 or ranked.user_id = auth.uid()
  order by ranked.position;
$$;

revoke all on function public.get_public_leaderboard(text, text) from public;
grant execute on function public.get_public_leaderboard(text, text) to anon, authenticated;
