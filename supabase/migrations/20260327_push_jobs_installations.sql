-- Push refactor: user+installation targeting and server-side job dispatch

create table if not exists public.push_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id)
);

create unique index if not exists push_installations_user_endpoint_unique on public.push_installations(user_id, endpoint);
create index if not exists push_installations_user_installation_idx on public.push_installations(user_id, installation_id);
create index if not exists push_installations_active_idx on public.push_installations(user_id) where revoked_at is null;

create table if not exists public.push_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  event_type text not null check (event_type in ('work_complete', 'break_complete')),
  installation_id text not null,
  fire_at timestamptz not null,
  status text not null check (status in ('scheduled', 'processing', 'sent', 'failed', 'canceled')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  canceled_at timestamptz,
  last_error text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id, event_type)
);

create index if not exists push_jobs_status_fire_at_idx on public.push_jobs(status, fire_at);
create index if not exists push_jobs_user_session_idx on public.push_jobs(user_id, session_id);
create index if not exists push_jobs_processing_claimed_idx on public.push_jobs(status, claimed_at) where status = 'processing';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_push_installations_set_updated_at on public.push_installations;
create trigger tr_push_installations_set_updated_at
before update on public.push_installations
for each row execute function public.set_updated_at();

drop trigger if exists tr_push_jobs_set_updated_at on public.push_jobs;
create trigger tr_push_jobs_set_updated_at
before update on public.push_jobs
for each row execute function public.set_updated_at();

create or replace function public.claim_due_push_jobs(p_limit integer default 100)
returns setof public.push_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select pj.id
    from public.push_jobs pj
    where pj.status = 'scheduled'
      and pj.fire_at <= now()
    order by pj.fire_at asc
    limit greatest(coalesce(p_limit, 100), 1)
    for update skip locked
  ), claimed as (
    update public.push_jobs pj
    set status = 'processing',
        claimed_at = now(),
        updated_at = now()
    from due
    where pj.id = due.id
    returning pj.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_due_push_jobs(integer) from public;
grant execute on function public.claim_due_push_jobs(integer) to service_role;

alter table public.push_installations enable row level security;
alter table public.push_jobs enable row level security;

drop policy if exists "push_installations_select_own" on public.push_installations;
create policy "push_installations_select_own"
  on public.push_installations for select
  using (user_id = auth.uid());

drop policy if exists "push_installations_insert_own" on public.push_installations;
create policy "push_installations_insert_own"
  on public.push_installations for insert
  with check (user_id = auth.uid());

drop policy if exists "push_installations_update_own" on public.push_installations;
create policy "push_installations_update_own"
  on public.push_installations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- push_jobs writes are done by backend/service role only.
drop policy if exists "push_jobs_select_own" on public.push_jobs;
create policy "push_jobs_select_own"
  on public.push_jobs for select
  using (user_id = auth.uid());

-- legacy cleanup
alter table if exists public.push_subscriptions disable row level security;
