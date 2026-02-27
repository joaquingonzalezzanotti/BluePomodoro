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
create unique index if not exists tasks_google_task_unique on public.tasks(user_id, google_task_id) where google_task_id is not null;

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

-- Add missing columns if upgrading an existing database
alter table public.profiles add column if not exists spotify_refresh_token text;
alter table public.profiles add column if not exists spotify_token_expires_at timestamptz;

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

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.push_subscriptions enable row level security;

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
end $$;
