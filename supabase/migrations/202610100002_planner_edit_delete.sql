begin;

alter table public.planner_entries add column deleted_at timestamptz;

drop index public.planner_open_goal;
create unique index planner_open_goal on public.planner_entries(user_id, chart_id, target)
  where status = 'pending' and deleted_at is null;

grant update(start_date, target, deleted_at) on public.planner_entries to authenticated;

create or replace function public.planner_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
    new.deleted_at := null;
  else
    new.revision := old.revision + 1;
    if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
      new.deleted_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

commit;
