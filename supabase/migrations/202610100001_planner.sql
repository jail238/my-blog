begin;

create table public.planner_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  chart_id text not null check (chart_id ~ '^(maishift-)?[0-9]+-(standard|dx)-(basic|advanced|expert|master|remaster)$'),
  target text not null check (target in ('AP', 'SSS+')),
  start_date date not null check (start_date between date '2000-01-01' and date '2099-12-31'),
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  resolved_date date,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_resolution check (
    (status = 'pending' and resolved_date is null) or
    (status in ('completed', 'skipped') and resolved_date is not null and resolved_date >= start_date and resolved_date <= date '2099-12-31')
  )
);

create unique index planner_open_goal on public.planner_entries (user_id, chart_id, target) where status = 'pending';
create index planner_user_date on public.planner_entries (user_id, start_date);

alter table public.planner_entries enable row level security;
revoke all on public.planner_entries from anon, authenticated;
grant select, insert on public.planner_entries to authenticated;
grant update (status, resolved_date) on public.planner_entries to authenticated;

create policy planner_read_own on public.planner_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy planner_insert_own on public.planner_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy planner_update_own on public.planner_entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.planner_before_write() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
  else
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.planner_before_write() from public;
create trigger planner_version before insert or update on public.planner_entries
  for each row execute function public.planner_before_write();

commit;
