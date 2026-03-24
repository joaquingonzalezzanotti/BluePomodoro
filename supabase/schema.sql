-- BluePomodoro Supabase schema (run in Supabase SQL editor)
-- Requires: Enable "Automatic RLS" and Realtime for tables if you want live sync.

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.task_status as enum ('Pendiente', 'En Proceso', 'Completada');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.pomodoro_mode as enum ('work', 'break');
exception
  when duplicate_object then null;
end $$;

-- Profiles (one per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now(),
  puntos_totales integer not null default 0,
  streak_days integer not null default 0,
  last_focus_date date,
  modo_estricto_activo boolean not null default false,
  sitios_bloqueados text[] not null default array['facebook.com','youtube.com','twitter.com','reddit.com'],
  spotify_playlist_url text,
  spotify_access_token text,
  spotify_refresh_token text,
  spotify_token_expires_at timestamptz,
  google_access_token text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  google_last_synced_at timestamptz,
  google_last_sync_error text,
  google_tasks_sync_mode text not null default 'read_only',
  google_calendar_sync_mode text not null default 'read_only',
  google_calendar_selection_mode text not null default 'all',
  google_calendar_selected_ids text[] not null default '{}'::text[],
  google_calendar_sync boolean not null default false,
  google_tasks_sync boolean not null default false,
  pomodoro_work_minutes integer not null default 40,
  pomodoro_break_minutes integer not null default 10,
  pomodoro_long_break_after integer not null default 4,
  pomodoro_long_break_threshold integer not null default 40,
  pomodoro_long_break_minutes_high integer not null default 20,
  pomodoro_long_break_minutes_low integer not null default 15,
  pomodoro_overtime_grace_seconds integer not null default 10
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects(user_id);

-- Subjects (Materias)
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists subjects_user_id_idx on public.subjects(user_id);
create index if not exists subjects_project_id_idx on public.subjects(project_id);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  status public.task_status not null default 'Pendiente',
  completed_at timestamptz,
  effort_estimated integer not null default 1,
  pomodoros_completed integer not null default 0,
  subtasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  due_date date,
  priority text,
  imported_from_google boolean not null default false,
  google_task_id text
);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_subject_id_idx on public.tasks(subject_id);
create unique index if not exists tasks_google_task_unique on public.tasks(user_id, google_task_id);

-- Pomodoro sessions
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  mode public.pomodoro_mode not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_sec integer not null,
  overtime_sec integer not null default 0,
  created_at timestamptz not null default now(),
  client_session_id uuid not null,
  unique (user_id, client_session_id)
);
create index if not exists pomodoro_sessions_user_id_idx on public.pomodoro_sessions(user_id);
create index if not exists pomodoro_sessions_completed_at_idx on public.pomodoro_sessions(completed_at);

-- Push subscriptions (PWA notifications)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create unique index if not exists push_subscriptions_user_endpoint_unique on public.push_subscriptions(user_id, endpoint);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- Aggregated daily stats (per user, local date)
create table if not exists public.user_daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  work_sessions integer not null default 0,
  break_sessions integer not null default 0,
  focus_minutes integer not null default 0,
  break_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  tasks_completed integer not null default 0,
  tasks_created integer not null default 0,
  active_focus_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);
create index if not exists user_daily_stats_user_id_idx on public.user_daily_stats(user_id);
create index if not exists user_daily_stats_local_date_idx on public.user_daily_stats(local_date);

-- Aggregated monthly stats (per user, month start)
create table if not exists public.user_monthly_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  work_sessions integer not null default 0,
  break_sessions integer not null default 0,
  focus_minutes integer not null default 0,
  break_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  tasks_completed integer not null default 0,
  tasks_created integer not null default 0,
  focus_days integer not null default 0,
  avg_sessions_per_focus_day numeric(10,2) not null default 0,
  productivity_score numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);
create index if not exists user_monthly_stats_user_id_idx on public.user_monthly_stats(user_id);
create index if not exists user_monthly_stats_month_start_idx on public.user_monthly_stats(month_start);

-- Add missing columns if upgrading an existing database
alter table public.profiles add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires';
alter table public.profiles add column if not exists spotify_refresh_token text;
alter table public.profiles add column if not exists spotify_token_expires_at timestamptz;
alter table public.profiles add column if not exists google_access_token text;
alter table public.profiles add column if not exists google_refresh_token text;
alter table public.profiles add column if not exists google_token_expires_at timestamptz;
alter table public.profiles add column if not exists google_last_synced_at timestamptz;
alter table public.profiles add column if not exists google_last_sync_error text;
alter table public.profiles add column if not exists google_tasks_sync_mode text not null default 'read_only';
alter table public.profiles add column if not exists google_calendar_sync_mode text not null default 'read_only';
alter table public.profiles add column if not exists google_calendar_selection_mode text not null default 'all';
alter table public.profiles add column if not exists google_calendar_selected_ids text[] not null default '{}'::text[];
alter table public.tasks add column if not exists completed_at timestamptz;
create index if not exists tasks_user_completed_at_idx on public.tasks(user_id, completed_at);
create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
as $$
  select exists (select 1 from pg_timezone_names where name = tz);
$$;
do $$ begin
  alter table public.profiles
    add constraint profiles_timezone_check
    check (public.is_valid_timezone(timezone));
exception
  when duplicate_object then null;
end $$;
do $$ begin
  alter table public.profiles
    add constraint profiles_google_tasks_sync_mode_check
    check (google_tasks_sync_mode in ('read_only', 'bidirectional'));
exception
  when duplicate_object then null;
end $$;
do $$ begin
  alter table public.profiles
    add constraint profiles_google_calendar_sync_mode_check
    check (google_calendar_sync_mode in ('read_only', 'bidirectional'));
exception
  when duplicate_object then null;
end $$;
do $$ begin
  alter table public.profiles
    add constraint profiles_google_calendar_selection_mode_check
    check (google_calendar_selection_mode in ('all', 'none', 'some'));
exception
  when duplicate_object then null;
end $$;
drop index if exists tasks_google_task_unique;
create unique index if not exists tasks_google_task_unique on public.tasks(user_id, google_task_id);

-- Profile auto-create on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Reward + streak update on work session insert
create or replace function public.on_pomodoro_session_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  current_focus_date date;
  last_date date;
  current_streak integer;
  reward_points integer := 100;
begin
  if new.mode = 'work' and new.completed_at is not null then
    select last_focus_date, streak_days
      into last_date, current_streak
      from public.profiles
     where id = new.user_id
     for update;

    current_focus_date := (new.completed_at at time zone 'UTC')::date;

    if last_date is null then
      current_streak := 1;
    elsif current_focus_date = last_date then
      current_streak := current_streak;
    elsif current_focus_date = last_date + 1 then
      current_streak := current_streak + 1;
    else
      current_streak := 1;
    end if;

    update public.profiles
       set puntos_totales = coalesce(puntos_totales, 0) + reward_points,
           last_focus_date = current_focus_date,
           streak_days = current_streak
     where id = new.user_id;

    if new.task_id is not null then
      update public.tasks
         set pomodoros_completed = pomodoros_completed + 1,
             effort_estimated = greatest(effort_estimated - 1, 0)
       where id = new.task_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_pomodoro_session_insert on public.pomodoro_sessions;
create trigger tr_pomodoro_session_insert
after insert on public.pomodoro_sessions
for each row execute function public.on_pomodoro_session_insert();

-- Timezone helper for stats rollups.
create or replace function public.resolve_profile_timezone(p_user_id uuid)
returns text
language plpgsql
stable
security definer
as $$
declare
  tz text;
begin
  select p.timezone into tz
    from public.profiles p
   where p.id = p_user_id;

  if tz is null or not public.is_valid_timezone(tz) then
    return 'UTC';
  end if;

  return tz;
end;
$$;

-- Maintain completed_at based on task status transitions.
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'Completada' then
      new.completed_at := coalesce(new.completed_at, now());
    else
      new.completed_at := null;
    end if;
    return new;
  end if;

  if new.status = 'Completada' then
    new.completed_at := coalesce(new.completed_at, old.completed_at, now());
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_tasks_set_completed_at on public.tasks;
create trigger tr_tasks_set_completed_at
before insert or update of status, completed_at on public.tasks
for each row execute function public.set_task_completed_at();

-- Recompute one user's daily stats row.
create or replace function public.recompute_user_daily_stats(p_user_id uuid, p_local_date date)
returns void
language plpgsql
security definer
as $$
declare
  tz text;
  v_work_sessions integer := 0;
  v_break_sessions integer := 0;
  v_focus_minutes integer := 0;
  v_break_minutes integer := 0;
  v_overtime_minutes integer := 0;
  v_tasks_completed integer := 0;
  v_tasks_created integer := 0;
begin
  if p_user_id is null or p_local_date is null then
    return;
  end if;

  tz := public.resolve_profile_timezone(p_user_id);

  select
    coalesce(count(*) filter (where mode = 'work' and completed_at is not null), 0),
    coalesce(count(*) filter (where mode = 'break' and completed_at is not null), 0),
    coalesce(sum(case when mode = 'work' and completed_at is not null then greatest(duration_sec, 0) else 0 end), 0) / 60,
    coalesce(sum(case when mode = 'break' and completed_at is not null then greatest(duration_sec, 0) else 0 end), 0) / 60,
    coalesce(sum(case when completed_at is not null then greatest(overtime_sec, 0) else 0 end), 0) / 60
  into
    v_work_sessions,
    v_break_sessions,
    v_focus_minutes,
    v_break_minutes,
    v_overtime_minutes
  from public.pomodoro_sessions
  where user_id = p_user_id
    and completed_at is not null
    and (completed_at at time zone tz)::date = p_local_date;

  select coalesce(count(*), 0)
    into v_tasks_completed
    from public.tasks
   where user_id = p_user_id
     and status = 'Completada'
     and completed_at is not null
     and (completed_at at time zone tz)::date = p_local_date;

  select coalesce(count(*), 0)
    into v_tasks_created
    from public.tasks
   where user_id = p_user_id
     and (created_at at time zone tz)::date = p_local_date;

  if v_work_sessions = 0
     and v_break_sessions = 0
     and v_focus_minutes = 0
     and v_break_minutes = 0
     and v_overtime_minutes = 0
     and v_tasks_completed = 0
     and v_tasks_created = 0 then
    delete from public.user_daily_stats
     where user_id = p_user_id
       and local_date = p_local_date;
    return;
  end if;

  insert into public.user_daily_stats (
    user_id,
    local_date,
    work_sessions,
    break_sessions,
    focus_minutes,
    break_minutes,
    overtime_minutes,
    tasks_completed,
    tasks_created,
    active_focus_day,
    updated_at
  )
  values (
    p_user_id,
    p_local_date,
    v_work_sessions,
    v_break_sessions,
    v_focus_minutes,
    v_break_minutes,
    v_overtime_minutes,
    v_tasks_completed,
    v_tasks_created,
    v_work_sessions > 0,
    now()
  )
  on conflict (user_id, local_date)
  do update set
    work_sessions = excluded.work_sessions,
    break_sessions = excluded.break_sessions,
    focus_minutes = excluded.focus_minutes,
    break_minutes = excluded.break_minutes,
    overtime_minutes = excluded.overtime_minutes,
    tasks_completed = excluded.tasks_completed,
    tasks_created = excluded.tasks_created,
    active_focus_day = excluded.active_focus_day,
    updated_at = now();
end;
$$;

-- Recompute one user's monthly stats row.
create or replace function public.refresh_user_monthly_stats(p_user_id uuid, p_month_start date)
returns void
language plpgsql
security definer
as $$
declare
  v_work_sessions integer := 0;
  v_break_sessions integer := 0;
  v_focus_minutes integer := 0;
  v_break_minutes integer := 0;
  v_overtime_minutes integer := 0;
  v_tasks_completed integer := 0;
  v_tasks_created integer := 0;
  v_focus_days integer := 0;
  v_avg_sessions_per_focus_day numeric(10,2) := 0;
  v_productivity_score numeric(10,2) := 0;
  v_next_month date;
begin
  if p_user_id is null or p_month_start is null then
    return;
  end if;

  v_next_month := (p_month_start + interval '1 month')::date;

  select
    coalesce(sum(work_sessions), 0),
    coalesce(sum(break_sessions), 0),
    coalesce(sum(focus_minutes), 0),
    coalesce(sum(break_minutes), 0),
    coalesce(sum(overtime_minutes), 0),
    coalesce(sum(tasks_completed), 0),
    coalesce(sum(tasks_created), 0),
    coalesce(count(*) filter (where active_focus_day), 0)
  into
    v_work_sessions,
    v_break_sessions,
    v_focus_minutes,
    v_break_minutes,
    v_overtime_minutes,
    v_tasks_completed,
    v_tasks_created,
    v_focus_days
  from public.user_daily_stats
  where user_id = p_user_id
    and local_date >= p_month_start
    and local_date < v_next_month;

  if v_work_sessions = 0
     and v_break_sessions = 0
     and v_focus_minutes = 0
     and v_break_minutes = 0
     and v_overtime_minutes = 0
     and v_tasks_completed = 0
     and v_tasks_created = 0
     and v_focus_days = 0 then
    delete from public.user_monthly_stats
     where user_id = p_user_id
       and month_start = p_month_start;
    return;
  end if;

  v_avg_sessions_per_focus_day :=
    case
      when v_focus_days > 0 then round(v_work_sessions::numeric / v_focus_days, 2)
      else 0
    end;

  -- Composite KPI tuned for trend comparison (not a strict scientific metric).
  v_productivity_score := round(
    (v_focus_minutes::numeric / 60.0)
    + (v_tasks_completed::numeric * 2.50)
    + (v_focus_days::numeric * 0.75),
    2
  );

  insert into public.user_monthly_stats (
    user_id,
    month_start,
    work_sessions,
    break_sessions,
    focus_minutes,
    break_minutes,
    overtime_minutes,
    tasks_completed,
    tasks_created,
    focus_days,
    avg_sessions_per_focus_day,
    productivity_score,
    updated_at
  )
  values (
    p_user_id,
    p_month_start,
    v_work_sessions,
    v_break_sessions,
    v_focus_minutes,
    v_break_minutes,
    v_overtime_minutes,
    v_tasks_completed,
    v_tasks_created,
    v_focus_days,
    v_avg_sessions_per_focus_day,
    v_productivity_score,
    now()
  )
  on conflict (user_id, month_start)
  do update set
    work_sessions = excluded.work_sessions,
    break_sessions = excluded.break_sessions,
    focus_minutes = excluded.focus_minutes,
    break_minutes = excluded.break_minutes,
    overtime_minutes = excluded.overtime_minutes,
    tasks_completed = excluded.tasks_completed,
    tasks_created = excluded.tasks_created,
    focus_days = excluded.focus_days,
    avg_sessions_per_focus_day = excluded.avg_sessions_per_focus_day,
    productivity_score = excluded.productivity_score,
    updated_at = now();
end;
$$;

create or replace function public.refresh_user_monthly_stats_for_date(p_user_id uuid, p_local_date date)
returns void
language plpgsql
security definer
as $$
begin
  if p_user_id is null or p_local_date is null then
    return;
  end if;

  perform public.refresh_user_monthly_stats(
    p_user_id,
    date_trunc('month', p_local_date::timestamp)::date
  );
end;
$$;

create or replace function public.refresh_user_stats_for_date(p_user_id uuid, p_local_date date)
returns void
language plpgsql
security definer
as $$
begin
  if p_user_id is null or p_local_date is null then
    return;
  end if;

  perform public.recompute_user_daily_stats(p_user_id, p_local_date);
  perform public.refresh_user_monthly_stats_for_date(p_user_id, p_local_date);
end;
$$;

-- React to session changes for daily/monthly rollups.
create or replace function public.on_pomodoro_session_stats_change()
returns trigger
language plpgsql
security definer
as $$
declare
  old_tz text;
  new_tz text;
  old_date date;
  new_date date;
begin
  if tg_op <> 'INSERT' then
    old_tz := public.resolve_profile_timezone(old.user_id);
    if old.completed_at is not null then
      old_date := (old.completed_at at time zone old_tz)::date;
    end if;
  end if;

  if tg_op <> 'DELETE' then
    new_tz := public.resolve_profile_timezone(new.user_id);
    if new.completed_at is not null then
      new_date := (new.completed_at at time zone new_tz)::date;
    end if;
  end if;

  if old_date is not null then
    perform public.refresh_user_stats_for_date(old.user_id, old_date);
  end if;

  if new_date is not null then
    perform public.refresh_user_stats_for_date(new.user_id, new_date);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_pomodoro_session_stats_change on public.pomodoro_sessions;
create trigger tr_pomodoro_session_stats_change
after insert or update or delete on public.pomodoro_sessions
for each row execute function public.on_pomodoro_session_stats_change();

-- React to task changes (created/completed counters).
create or replace function public.on_task_stats_change()
returns trigger
language plpgsql
security definer
as $$
declare
  old_tz text;
  new_tz text;
  old_created_date date;
  new_created_date date;
  old_completed_date date;
  new_completed_date date;
begin
  if tg_op <> 'INSERT' then
    old_tz := public.resolve_profile_timezone(old.user_id);
    old_created_date := (old.created_at at time zone old_tz)::date;
    if old.completed_at is not null then
      old_completed_date := (old.completed_at at time zone old_tz)::date;
    end if;
  end if;

  if tg_op <> 'DELETE' then
    new_tz := public.resolve_profile_timezone(new.user_id);
    new_created_date := (new.created_at at time zone new_tz)::date;
    if new.completed_at is not null then
      new_completed_date := (new.completed_at at time zone new_tz)::date;
    end if;
  end if;

  if old_created_date is not null then
    perform public.refresh_user_stats_for_date(old.user_id, old_created_date);
  end if;
  if old_completed_date is not null then
    perform public.refresh_user_stats_for_date(old.user_id, old_completed_date);
  end if;

  if new_created_date is not null then
    perform public.refresh_user_stats_for_date(new.user_id, new_created_date);
  end if;
  if new_completed_date is not null then
    perform public.refresh_user_stats_for_date(new.user_id, new_completed_date);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_task_stats_change on public.tasks;
create trigger tr_task_stats_change
after insert or update or delete on public.tasks
for each row execute function public.on_task_stats_change();

-- Full rebuild helper (safe to rerun).
create or replace function public.rebuild_user_stats(p_user_id uuid default null)
returns void
language plpgsql
security definer
as $$
declare
  v_user record;
  v_day record;
  v_month record;
  tz text;
begin
  if p_user_id is null then
    for v_user in
      select id from auth.users
    loop
      perform public.rebuild_user_stats(v_user.id);
    end loop;
    return;
  end if;

  delete from public.user_daily_stats where user_id = p_user_id;
  delete from public.user_monthly_stats where user_id = p_user_id;

  tz := public.resolve_profile_timezone(p_user_id);

  for v_day in
    select distinct local_date
      from (
        select (ps.completed_at at time zone tz)::date as local_date
          from public.pomodoro_sessions ps
         where ps.user_id = p_user_id
           and ps.completed_at is not null
        union
        select (t.created_at at time zone tz)::date as local_date
          from public.tasks t
         where t.user_id = p_user_id
        union
        select (t.completed_at at time zone tz)::date as local_date
          from public.tasks t
         where t.user_id = p_user_id
           and t.completed_at is not null
      ) d
     where local_date is not null
  loop
    perform public.recompute_user_daily_stats(p_user_id, v_day.local_date);
  end loop;

  for v_month in
    select distinct date_trunc('month', local_date::timestamp)::date as month_start
      from public.user_daily_stats
     where user_id = p_user_id
  loop
    perform public.refresh_user_monthly_stats(p_user_id, v_month.month_start);
  end loop;
end;
$$;

-- Monthly comparison view for client consumption.
create or replace view public.v_user_monthly_comparison as
with base as (
  select
    ums.*,
    lag(ums.work_sessions) over (partition by ums.user_id order by ums.month_start) as prev_work_sessions,
    lag(ums.focus_minutes) over (partition by ums.user_id order by ums.month_start) as prev_focus_minutes,
    lag(ums.tasks_completed) over (partition by ums.user_id order by ums.month_start) as prev_tasks_completed,
    lag(ums.productivity_score) over (partition by ums.user_id order by ums.month_start) as prev_productivity_score
  from public.user_monthly_stats ums
  where ums.user_id = auth.uid()
)
select
  b.user_id,
  b.month_start,
  b.work_sessions,
  b.break_sessions,
  b.focus_minutes,
  b.break_minutes,
  b.overtime_minutes,
  b.tasks_completed,
  b.tasks_created,
  b.focus_days,
  b.avg_sessions_per_focus_day,
  b.productivity_score,
  b.prev_work_sessions,
  b.prev_focus_minutes,
  b.prev_tasks_completed,
  b.prev_productivity_score,
  (b.work_sessions - coalesce(b.prev_work_sessions, 0)) as delta_work_sessions,
  (b.focus_minutes - coalesce(b.prev_focus_minutes, 0)) as delta_focus_minutes,
  (b.tasks_completed - coalesce(b.prev_tasks_completed, 0)) as delta_tasks_completed,
  round((b.productivity_score - coalesce(b.prev_productivity_score, 0))::numeric, 2) as delta_productivity_score,
  case
    when b.prev_work_sessions is null or b.prev_work_sessions = 0 then null
    else round(((b.work_sessions - b.prev_work_sessions)::numeric / nullif(b.prev_work_sessions, 0)) * 100, 2)
  end as delta_work_sessions_pct,
  case
    when b.prev_focus_minutes is null or b.prev_focus_minutes = 0 then null
    else round(((b.focus_minutes - b.prev_focus_minutes)::numeric / nullif(b.prev_focus_minutes, 0)) * 100, 2)
  end as delta_focus_minutes_pct,
  case
    when b.prev_tasks_completed is null or b.prev_tasks_completed = 0 then null
    else round(((b.tasks_completed - b.prev_tasks_completed)::numeric / nullif(b.prev_tasks_completed, 0)) * 100, 2)
  end as delta_tasks_completed_pct,
  case
    when b.prev_productivity_score is null or b.prev_productivity_score = 0 then null
    else round(((b.productivity_score - b.prev_productivity_score)::numeric / nullif(b.prev_productivity_score, 0)) * 100, 2)
  end as delta_productivity_score_pct
from base b;

-- One-time backfill for existing users when stats tables are empty.
do $$
begin
  if not exists (select 1 from public.user_daily_stats limit 1)
     and not exists (select 1 from public.user_monthly_stats limit 1) then
    perform public.rebuild_user_stats();
  end if;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_daily_stats enable row level security;
alter table public.user_monthly_stats enable row level security;

-- Policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "projects_crud_own" on public.projects;
create policy "projects_crud_own"
  on public.projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "subjects_crud_own" on public.subjects;
create policy "subjects_crud_own"
  on public.subjects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tasks_crud_own" on public.tasks;
create policy "tasks_crud_own"
  on public.tasks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "pomodoro_sessions_crud_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_crud_own"
  on public.pomodoro_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_crud_own" on public.push_subscriptions;
create policy "push_subscriptions_crud_own"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_daily_stats_select_own" on public.user_daily_stats;
create policy "user_daily_stats_select_own"
  on public.user_daily_stats for select
  using (user_id = auth.uid());

drop policy if exists "user_monthly_stats_select_own" on public.user_monthly_stats;
create policy "user_monthly_stats_select_own"
  on public.user_monthly_stats for select
  using (user_id = auth.uid());

-- Realtime (optional, required for cross-device live updates)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects') then
    execute 'alter publication supabase_realtime add table public.projects';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'subjects') then
    execute 'alter publication supabase_realtime add table public.subjects';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    execute 'alter publication supabase_realtime add table public.tasks';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pomodoro_sessions') then
    execute 'alter publication supabase_realtime add table public.pomodoro_sessions';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_daily_stats') then
    execute 'alter publication supabase_realtime add table public.user_daily_stats';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_monthly_stats') then
    execute 'alter publication supabase_realtime add table public.user_monthly_stats';
  end if;
end $$;
