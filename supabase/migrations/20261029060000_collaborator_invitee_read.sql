-- FIX: invitees cannot see collaborations shared with them.
--
-- The "Invitees can read their own collaborator records" policy compared
-- invitee_email to (select email from auth.users where id = auth.uid()).
-- That subquery runs as the `authenticated` role, and auth.users has RLS
-- enabled, so reading the caller's own row returns NULL under a normal
-- API request. The policy therefore matched nothing and invitees always
-- saw zero collaborations.
--
-- Introduce a SECURITY DEFINER helper (bypasses auth.users RLS) and use
-- it in the policy so the email comparison actually resolves.

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from auth.users where id = auth.uid();
$$;

revoke all on function public.current_user_email() from public;
grant execute on function public.current_user_email() to authenticated;

drop policy if exists "Invitees can read their own collaborator records" on public.collaborators;
create policy "Invitees can read their own collaborator records"
  on public.collaborators for select to authenticated
  using (invitee_email = public.current_user_email());
