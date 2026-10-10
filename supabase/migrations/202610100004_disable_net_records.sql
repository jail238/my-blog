begin;

-- Preserve the snapshot while disabling all browser access to the retired importer.
revoke all on function public.can_import_net_records() from public, anon, authenticated;
revoke all on function public.import_net_records(jsonb, jsonb) from public, anon, authenticated;
revoke all on public.record_snapshot, public.record_publishers from public, anon, authenticated;
drop policy if exists "Public archive scores" on public.record_snapshot;

commit;
