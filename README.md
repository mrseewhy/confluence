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
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the app:

```sh
npm run dev
```

## Supabase Auth

The login, signup, Google OAuth, and password recovery screens use Supabase Auth via `src/lib/supabase.ts`.

In the Supabase dashboard, configure these Auth URLs for local development:

```text
http://localhost:5173/dashboard
http://localhost:5173/login
```

The app still uses mock folder/note data. Database-backed folders, notes, profiles, and row-level security policies are the next integration step.

## Scripts

```sh
npm run dev
npm run build
npm run lint
npm run preview
```
