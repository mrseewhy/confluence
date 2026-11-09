# Contributing to Confluence

## Getting set up

```bash
git clone <repo>
cd confluence
npm install
cp .env.example .env.local     # then fill in your Supabase keys
supabase start                 # local stack (API :54321, DB :54322)
supabase db reset              # apply migrations + seed data
./scripts/seed-test-users.sh   # set passwords on the seeded accounts
npm run dev
```

Seeded logins (after `seed-test-users.sh`):

| Email | Password | Role |
| --- | --- | --- |
| `alex@confluence.test` | `Alex123!` | admin |
| `sarah@confluence.test` | `Sarah123!` | user |
| `marcus@confluence.test` | `Marcus123!` | user |

## Before you open a PR

All four of these must pass — CI enforces the first three:

```bash
npx tsc -b            # types
npx eslint src        # lint (must be 0 errors AND 0 warnings)
npx vitest run        # unit tests
npx playwright test   # e2e (needs the local stack running)
```

## How the code is organised

- `src/pages/` — routes; one file per screen
- `src/components/` — reusable UI; feature components live here too
- `src/hooks/` — stateful logic, especially `useNoteEditor` (the note editor core)
- `src/lib/` — pure helpers, all unit tested
- `supabase/migrations/` — **the source of truth for the database**
- `supabase/schema.sql` — a snapshot kept in sync manually

## Database changes

Never edit tables by hand. Add a migration:

```bash
supabase migration new your_change_name
# edit the generated file
supabase db reset          # verify it applies from scratch
supabase db push           # push to the linked project (ask first!)
```

Every table needs RLS policies. Follow the existing pattern: access is granted
through `has_access_to_note()` / `has_access_to_folder()` rather than raw
`auth.uid()` comparisons, so collaborators work correctly.

### Testing policies

Behavioural proof beats reading SQL. `scripts/test-note-blocks-access.sql` is
the template: it impersonates users with
`set_config('request.jwt.claim.sub', ...)` and asserts what each can do.

## Things that are easy to get wrong

1. **`INSERT ... RETURNING` re-checks the SELECT policy.** A row you just
   inserted must be visible to you, or the insert fails with `42501`.
2. **`auth.users` is not readable from API requests.** Use a `SECURITY DEFINER`
   helper (`current_user_email()`) instead of subquerying it in a policy.
3. **PostgREST returns many-to-one embedded relations as objects, not arrays.**
   Use `toFirst()`, not `safeArray()`.
4. **Conflict detection is compare-and-swap on `notes.updated_at`.** Anything
   that writes blocks must bump it, or concurrent edits go undetected.
5. **The three-way merge compares block *content* only** — not type, not ids.
   Including type caused false conflicts on every block.

## Commit style

Short imperative subject, then a body explaining *why* when it isn't obvious.
If a change fixes a bug, say what the bug actually was.
