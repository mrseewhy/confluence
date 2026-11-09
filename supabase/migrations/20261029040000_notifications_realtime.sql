-- Enable Realtime on the notifications table so the bell can push
-- new/updated notifications to the subscriber without polling.
--
-- postgres_changes streams only fire for tables in the supabase_realtime
-- publication. Row-level security on notifications still applies, so a
-- subscriber only ever receives rows for their own user_id.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then
      -- already added
      null;
    end;
  end if;
end $$;
