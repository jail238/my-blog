begin;

create function public.can_manage_perfect_videos() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.record_publishers where user_id = auth.uid());
$$;
revoke all on function public.can_manage_perfect_videos() from public, anon;
grant execute on function public.can_manage_perfect_videos() to authenticated;

create table public.chart_perfect_videos (
  chart_id text primary key check (chart_id ~ '^(maishift-)?[0-9]+-(standard|dx)-(basic|advanced|expert|master|remaster)$'),
  url text not null check (url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$'),
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.chart_perfect_videos enable row level security;
revoke all on public.chart_perfect_videos from public, anon, authenticated;
grant select on public.chart_perfect_videos to anon, authenticated;
grant insert (chart_id, url), update (url, deleted_at) on public.chart_perfect_videos to authenticated;

create policy perfect_videos_read_public on public.chart_perfect_videos
  for select to anon, authenticated using (deleted_at is null);
create policy perfect_videos_read_owner on public.chart_perfect_videos
  for select to authenticated using ((select public.can_manage_perfect_videos()));
create policy perfect_videos_insert_owner on public.chart_perfect_videos
  for insert to authenticated with check ((select public.can_manage_perfect_videos()));
create policy perfect_videos_update_owner on public.chart_perfect_videos
  for update to authenticated using ((select public.can_manage_perfect_videos()))
  with check ((select public.can_manage_perfect_videos()));

create function public.perfect_video_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.revision := 1;
    new.deleted_at := null;
  else
    new.revision := old.revision + 1;
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.perfect_video_before_write() from public, anon, authenticated;
create trigger perfect_video_version before insert or update on public.chart_perfect_videos
  for each row execute function public.perfect_video_before_write();

commit;
