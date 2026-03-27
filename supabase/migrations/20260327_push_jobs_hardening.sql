-- Push hardening: ownership-safe scheduling + stale processing reclaim + legacy documentation

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
    where (
      pj.status = 'scheduled'
      and pj.fire_at <= now()
    )
    or (
      pj.status = 'processing'
      and pj.claimed_at is not null
      and pj.claimed_at <= now() - interval '5 minutes'
    )
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

comment on table public.push_subscriptions is
  'DEPRECATED: replaced by push_installations + push_jobs. Kept only for backwards compatibility.';
