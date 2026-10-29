-- Run only against the disposable local database after `supabase db reset`.
-- All fixture changes roll back, even on success.
\set ON_ERROR_STOP on
begin;
create temp table rpc_test_fixture as
select
  (select id from auth.users where email = 'sarah@confluence.test') as sarah,
  (select id from auth.users where email = 'marcus@confluence.test') as marcus,
  gen_random_uuid() as folder_id,
  gen_random_uuid() as note_id;
do $$ begin
  if (select sarah is null or marcus is null from rpc_test_fixture) then
    raise exception 'Seed accounts are missing';
  end if;
end $$;
insert into public.folders(id, owner_id, title, slug, visibility)
select folder_id, sarah, 'RPC access test', 'rpc-access-test', 'private'
from rpc_test_fixture;
insert into public.notes(id, folder_id, owner_id, title, slug, visibility)
select note_id, folder_id, sarah, 'Private RPC test', 'private-rpc-test', 'private'
from rpc_test_fixture;
grant select on rpc_test_fixture to authenticated;
set local role authenticated;
do $$
declare f rpc_test_fixture%rowtype; v uuid;
begin
  select * into f from rpc_test_fixture;
  perform set_config('request.jwt.claim.sub', f.sarah::text, true);
  v := public.save_note_version(f.note_id, f.sarah);
  if not exists (select 1 from public.get_note_versions(f.note_id) where id = v) then
    raise exception 'Owner cannot see their version';
  end if;
  perform public.restore_note_version(v, f.sarah);
  perform public.search_notes_by_content(f.sarah, 'Private RPC test');
  perform set_config('request.jwt.claim.sub', f.marcus::text, true);
  begin
    perform public.get_note_versions(f.note_id);
    raise exception 'Cross-user version read succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_note_version_blocks(v);
    raise exception 'Cross-user version preview succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.restore_note_version(v, f.marcus);
    raise exception 'Cross-user restore succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.search_notes_by_content(f.sarah, 'Private RPC test');
    raise exception 'Cross-user search succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.unread_notification_count(f.sarah);
    raise exception 'Cross-user notification count succeeded';
  exception when insufficient_privilege then null;
  end;
  raise notice 'Owner and cross-user access checks passed';
end $$;
reset role;
insert into public.collaborators(inviter_id, invitee_email, note_id, access_level)
select sarah, 'marcus@confluence.test', note_id, 'viewer' from rpc_test_fixture;
set local role authenticated;
do $$
declare f rpc_test_fixture%rowtype;
begin
  select * into f from rpc_test_fixture;
  perform set_config('request.jwt.claim.sub', f.marcus::text, true);
  if not exists (select 1 from public.get_note_versions(f.note_id)) then
    raise exception 'Invited collaborator cannot see history';
  end if;
  begin
    perform public.restore_note_version(
      (select id from public.get_note_versions(f.note_id) limit 1), f.marcus);
    raise exception 'Viewer restored a version';
  exception when insufficient_privilege then null;
  end;
  raise notice 'Collaborator read and viewer restriction checks passed';
end $$;
rollback;
