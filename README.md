# Confluence

A React + TypeScript + Vite prototype for a note-sharing app with public pages, user dashboards, admin dashboards, and Supabase-backed auth.

## Setup

Install dependencies:

```sh
npm install
```

Create a local env file:

```sh
cp .env.example .env.local
```

Add your Supabase project values:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

Run the app:

```sh
npm run dev
```

## Local Supabase

Start Supabase locally (requires Docker):

```sh
supabase start
supabase db reset    # applies schema + seeds public content
```

Then create user accounts with passwords:

```sh
./scripts/seed-test-users.sh
```

## Test Credentials

After running `seed-test-users.sh`, you can log in with these accounts:

| Email | Password | Type |
|-------|----------|------|
| `alex@confluence.test` | `Alex123!` | ★ Admin |
| `sarah@confluence.test` | `Sarah123!` | User |
| `marcus@confluence.test` | `Marcus123!` | User |
| `priya@confluence.test` | `Priya123!` | User |
| `emma@confluence.test` | `Emma123!` | User |

### Public content (no login required)

- **Homepage** — `/` — shows featured folders and latest notes
- **Browse folders** — `/folders` — browse all public folders with subfolder hierarchies
- **Browse notes** — `/notes` — search and browse all public notes
- Each folder/note has a permanent URL: `/{username}/folder/{slug}` or `/{username}/n/{slug}`

### After login

- **Dashboard** — `/dashboard` — manage your own folders, subfolders, and notes
- **Admin panel** — `/admin/dashboard` — (admin only) manage all users, folders, notes

## Scripts

```sh
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Lint check
npm run preview      # Preview production build
./scripts/seed-test-users.sh  # Create test user accounts
```
