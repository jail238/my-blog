create table public.record_publishers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.record_publishers enable row level security;
revoke all on public.record_publishers from anon, authenticated;

create table public.record_snapshot (
  id boolean primary key default true check (id),
  records jsonb not null default '{}'::jsonb check (jsonb_typeof(records) = 'object'),
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  revision bigint not null default 0,
  updated_at timestamptz
);
alter table public.record_snapshot enable row level security;
revoke all on public.record_snapshot from anon, authenticated;
grant select on public.record_snapshot to anon, authenticated;
create policy "Public archive scores" on public.record_snapshot for select to anon, authenticated using (true);
insert into public.record_snapshot (id) values (true);

create function public.can_import_net_records() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.record_publishers where user_id = auth.uid());
$$;
revoke all on function public.can_import_net_records() from public, anon;
grant execute on function public.can_import_net_records() to authenticated;

create function public.import_net_records(incoming_records jsonb, incoming_profile jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  state public.record_snapshot%rowtype;
  item record;
  previous jsonb;
  merged jsonb;
  payload jsonb;
  achievement numeric;
  old_combo integer;
  new_combo integer;
  old_sync integer;
  new_sync integer;
  changed integer := 0;
  milestones integer := 0;
  stamp text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  combos text[] := array['', 'FC', 'FC+', 'AP', 'AP+'];
  syncs text[] := array['', 'SYNC', 'FS', 'FS+', 'FSD', 'FSD+'];
begin
  if not public.can_import_net_records() then
    raise exception 'Only the archive owner can import records' using errcode = '42501';
  end if;
  if jsonb_typeof(incoming_records) is distinct from 'object'
     or octet_length(incoming_records::text) > 5000000
     or jsonb_typeof(incoming_profile) is distinct from 'object' then
    raise exception 'Invalid import payload' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(incoming_records)) not between 1 and 10000 then
    raise exception 'Empty or oversized import' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(incoming_profile) k where k not in ('rating', 'className', 'playCount'))
     or (incoming_profile ? 'rating' and (jsonb_typeof(incoming_profile->'rating') <> 'number' or (incoming_profile->>'rating')::numeric not between 0 and 100000 or (incoming_profile->>'rating')::numeric <> trunc((incoming_profile->>'rating')::numeric)))
     or (incoming_profile ? 'playCount' and (jsonb_typeof(incoming_profile->'playCount') <> 'number' or (incoming_profile->>'playCount')::numeric not between 0 and 100000000 or (incoming_profile->>'playCount')::numeric <> trunc((incoming_profile->>'playCount')::numeric)))
     or (incoming_profile ? 'className' and (jsonb_typeof(incoming_profile->'className') <> 'string' or (incoming_profile->>'className') !~ '^(B[1-5]|A[1-5]|S[1-5]|SS[1-5]|SSS[1-5]|LEGEND)$')) then
    raise exception 'Invalid profile' using errcode = '22023';
  end if;

  select * into state from public.record_snapshot where id = true for update;
  for item in select key, value from jsonb_each(incoming_records) loop
    payload := item.value;
    if item.key !~ '^(maishift-)?[0-9]+-(standard|dx)-(basic|advanced|expert|master|remaster)$'
       or jsonb_typeof(payload) is distinct from 'object'
       or exists (select 1 from jsonb_object_keys(payload) k where k not in ('achievementValue', 'rank', 'rating', 'combo', 'sync', 'dxScore', 'dxScoreMax'))
       or not (payload ?& array['achievementValue', 'rank', 'rating', 'combo', 'sync', 'dxScore', 'dxScoreMax']) then
      raise exception 'Invalid chart record' using errcode = '22023';
    end if;
    achievement := (payload->>'achievementValue')::numeric;
    if jsonb_typeof(payload->'achievementValue') <> 'number' or achievement not between 0 and 101
       or achievement * 10000 <> trunc(achievement * 10000)
       or jsonb_typeof(payload->'rank') <> 'string' or jsonb_typeof(payload->'combo') <> 'string' or jsonb_typeof(payload->'sync') <> 'string'
       or (payload->>'rank') !~ '^(SSS\+|SSS|SS\+|SS|S\+|S|AAA|AA|A|BBB|BB|B|C|D)$'
       or jsonb_typeof(payload->'rating') <> 'number' or (payload->>'rating')::numeric not between 0 and 10000
       or (payload->>'rating')::numeric <> trunc((payload->>'rating')::numeric)
       or not ((payload->>'combo') = any(combos)) or not ((payload->>'sync') = any(syncs))
       or jsonb_typeof(payload->'dxScore') <> 'number' or jsonb_typeof(payload->'dxScoreMax') <> 'number'
       or (payload->>'dxScore')::numeric not between 0 and 100000
       or (payload->>'dxScoreMax')::numeric not between (payload->>'dxScore')::numeric and 100000
       or (payload->>'dxScore')::numeric <> trunc((payload->>'dxScore')::numeric)
       or (payload->>'dxScoreMax')::numeric <> trunc((payload->>'dxScoreMax')::numeric) then
      raise exception 'Invalid score value' using errcode = '22023';
    end if;
    previous := coalesce(state.records->item.key, '{}'::jsonb);
    merged := previous;
    if not (previous ? 'achievementValue') or achievement > (previous->>'achievementValue')::numeric then
      merged := merged || jsonb_build_object('achievementValue', achievement, 'achievement', to_char(achievement, 'FM990.0000') || '%', 'rank', payload->>'rank', 'rating', (payload->>'rating')::integer);
    end if;
    old_combo := coalesce(array_position(combos, previous->>'combo'), 1);
    new_combo := array_position(combos, payload->>'combo');
    if new_combo > old_combo or not (merged ? 'combo') then
      merged := merged || jsonb_build_object('combo', payload->>'combo');
    end if;
    if new_combo > old_combo and new_combo >= 4 then
      merged := merged || jsonb_build_object('perfectAchievedAt', stamp);
      if new_combo = 4 and not (previous ? 'apAchievedAt') then
        merged := merged || jsonb_build_object('apAchievedAt', stamp, 'apDateSource', 'observed');
      elsif new_combo = 5 and not (previous ? 'apPlusAchievedAt') then
        merged := merged || jsonb_build_object('apPlusAchievedAt', stamp, 'apPlusDateSource', 'observed');
      end if;
      milestones := milestones + 1;
    end if;
    old_sync := coalesce(array_position(syncs, previous->>'sync'), 1);
    new_sync := array_position(syncs, payload->>'sync');
    if new_sync > old_sync or not (merged ? 'sync') then
      merged := merged || jsonb_build_object('sync', payload->>'sync');
    end if;
    if not (previous ? 'dxScoreMax') or (payload->>'dxScoreMax')::integer <> (previous->>'dxScoreMax')::integer
       or (payload->>'dxScore')::integer > (previous->>'dxScore')::integer then
      merged := merged || jsonb_build_object('dxScore', (payload->>'dxScore')::integer, 'dxScoreMax', (payload->>'dxScoreMax')::integer);
    end if;
    if merged is distinct from previous then
      state.records := jsonb_set(state.records, array[item.key], merged);
      changed := changed + 1;
    end if;
  end loop;
  update public.record_snapshot set records = state.records, profile = state.profile || incoming_profile,
    revision = state.revision + 1, updated_at = stamp::timestamptz where id = true;
  return jsonb_build_object('changed', changed, 'milestones', milestones, 'revision', state.revision + 1, 'updatedAt', stamp);
end;
$$;
revoke all on function public.import_net_records(jsonb, jsonb) from public, anon;
grant execute on function public.import_net_records(jsonb, jsonb) to authenticated;
