# Confluence

A collaborative note-taking application with real-time editing, folder organization, and granular sharing permissions. Built with React, TypeScript, and Supabase.

## Features

- **Rich Note Editor** — Block-based editor supporting text, code (with syntax highlighting), images, videos, and headings
- **Real-Time Collaboration** — See who's viewing the same note via presence indicators; receive live block updates from collaborators
- **Folder Organization** — Nest folders, create subfolders, and organize notes hierarchically
- **Granular Sharing** — Share individual notes or entire folders as viewer or editor; transfer ownership
- **Role-Based Access** — User dashboard for personal content; admin dashboard for user/note/folder management
- **Activity Logging** — Track invitations, deletions, visibility changes, and admin actions
- **Image Uploads** — Upload and embed images stored in Supabase Storage
- **Dark Mode** — Built-in theme toggle with persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, React Router |
| **Build** | Vite, Babel |
| **Backend / Database** | Supabase (PostgreSQL 17, Auth, Realtime, Storage, Edge Functions) |
| **State / Data** | TanStack React Query, Supabase JS Client |
| **UI / Interactions** | `@dnd-kit` (drag-and-drop), `react-syntax-highlighter` |
| **Testing** | Vitest with jsdom/happy-dom (unit), Playwright (e2e) |
| **Linting** | ESLint with `typescript-eslint` |

## Architecture

### Routing

The app uses three route groups defined in `src/App.tsx`:

```text
/                         Public pages (home, sign in, sign up, notes, folders)
/dashboard/*              User dashboard (protected — requires `user` role)
/admin/dashboard/*        Admin dashboard (protected — requires `admin` role)
```

Public pages are lazy-loaded for performance. Unauthenticated users can browse public notes and folders; editing and dashboard access require authentication.

### Authentication & Authorization

- Authentication is handled by **Supabase Auth** with email/password
- A `profiles` table extends `auth.users` with `user_type` (`user` | `admin`), `subscription_tier`, `avatar_url`, and `is_banned`
- A database trigger (`handle_new_user`) automatically creates a profile, notification preferences, and a default "general" folder on signup
- Route protection uses the `<RequireAuth>` wrapper component with role checks
- **Row-Level Security (RLS)** enforces data access at the database level using helper functions like `has_access_to_folder()` and `has_access_to_note()`

### Database Schema

Key tables in the `public` schema:

| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users with roles, subscription, and avatar |
| `folders` | Hierarchical folder structure (self-referencing via `parent_id`) |
| `notes` | Notes owned by users, organized in folders |
| `note_blocks` | Ordered content blocks within notes (text, code, image, video, heading) |
| `collaborators` | Share permissions (viewer/editor) for folders or notes |
| `activity_log` | Audit trail for user and admin actions |
| `notification_preferences` | Per-user email notification settings |

### Real-Time Collaboration

Supabase Realtime enables:
- **Presence tracking** — see which collaborators are currently viewing a note
- **Block broadcasting** — live updates when a collaborator edits (debounced via auto-save)

Edge Functions handle:
- `send-collaborator-invite` — sends sharing invitation emails
- `delete-account` — handles full account deletion

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** (or pnpm / yarn)
- **Docker Desktop** — required by the Supabase CLI for local development
- **Supabase CLI** — see [installation guide](https://supabase.com/docs/guides/cli/getting-started)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd confluence

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Local Supabase Setup

```bash
# Start Supabase services (PostgreSQL, Auth, Realtime, Storage, Studio)
supabase start

# Seed the database with test data
bash scripts/setup-local.sh
```

The setup script:
1. Applies the database schema from `supabase/schema.sql`
2. Seeds 5 test users with notes, folders, and sample collaborations
3. Configures admin RPC functions

### Available Test Accounts

These accounts are seeded by `supabase/seed-full.sql`:

| Email | Password | Role |
|-------|----------|------|
| `alex@confluence.test` | `Alex123!` | Admin |
| `sarah@confluence.test` | `Sarah123!` | User |
| `marcus@confluence.test` | `Marcus123!` | User |
| `priya@confluence.test` | `Priya123!` | User |
| `emma@confluence.test` | `Emma123!` | User |

### Start Development Server

```bash
npm run dev
```

The app runs at `http://localhost:5173`. Supabase Studio is available at `http://127.0.0.1:54323`.

### Verify Everything is Running

```bash
bash scripts/check-services.sh
```

This checks the dev server, Supabase API, database, Studio, admin RPCs, and seed data.

## Project Structure

```text
├── src/
│   ├── App.tsx                      # Root with routing & providers
│   ├── main.tsx                     # React entry point
│   ├── types/index.ts               # Shared TypeScript interfaces
│   ├── context/
│   │   ├── AuthProvider.tsx          # Auth state management
│   │   ├── ThemeContext.tsx          # Dark/light mode
│   │   ├── auth.ts                  # Auth helpers
│   │   └── theme.ts                 # Theme tokens
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client singleton
│   │   ├── helpers.tsx              # Shared utility functions
│   │   ├── safeParse.ts             # Safe JSON parsing
│   │   └── upload.ts                # File upload helpers
│   ├── hooks/
│   │   ├── useNoteEditor.ts         # Editor state & auto-save logic
│   │   └── useRealtimeCollaboration.ts  # Realtime presence & broadcasting
│   ├── components/
│   │   ├── layout/                  # Navbar, DashboardLayout, Footer, etc.
│   │   ├── editor/                  # NoteEditor, TextBlock, CodeBlock, etc.
│   │   ├── ui/                      # Shared UI primitives
│   │   ├── RequireAuth.tsx          # Route guard
│   │   ├── Modal.tsx / Toast.tsx    # Overlay components
│   │   ├── ShareModal.tsx           # Sharing UI
│   │   └── ThemeToggle.tsx          # Dark mode toggle
│   ├── pages/
│   │   ├── dashboard/               # User dashboard pages
│   │   ├── admin/                   # Admin dashboard pages
│   │   └── ...                      # Public pages
│   └── styles/                      # Global CSS & design tokens
├── supabase/
│   ├── config.toml                  # Local Supabase configuration
│   ├── schema.sql                   # Database schema (migrations)
│   ├── seed-full.sql                # Test data seed
│   ├── admin-rpc.sql                # Admin stored procedures
│   └── functions/                   # Edge Functions
│       ├── delete-account/
│       └── send-collaborator-invite/
├── scripts/
│   ├── setup-local.sh               # Full local setup
│   ├── check-services.sh            # Health check
│   └── seed-test-users.sh           # Seed user passwords
├── e2e/                             # Playwright end-to-end tests
├── playwright.config.ts
├── vitest.config.ts
└── vite.config.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | Run ESLint across `src/` |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run preview` | Preview production build |
| `npx playwright test` | Run e2e tests (starts dev server automatically) |

## Testing

### Unit Tests (Vitest)

Located alongside source files as `*.test.ts` or `*.test.tsx`. Run with:

```bash
npm test                       # All tests
npx vitest run --reporter=verbose  # Verbose output
```

The test environment uses `jsdom` with `@testing-library/react` for component tests and `happy-dom` for hook tests. Supabase client is mocked globally in `src/test/setup.ts`.

### End-to-End Tests (Playwright)

Located in `e2e/`. Run with:

```bash
npx playwright test                     # All browsers
npx playwright test --project=chromium  # Chromium only
npx playwright test --ui                # Interactive UI mode
```

Playwright automatically starts the Vite dev server. Tests cover:
- **Auth flows** — sign up, sign in, password reset, redirects
- **Notes flows** — create, edit, delete notes; collaboration sharing

### Health Check Script

```bash
bash scripts/check-services.sh
```

Verifies all local services are running and correctly configured.

## Deployment

### Frontend (Static Hosting)

The app is a standard Vite + React SPA. Build and deploy to any static host:

```bash
npm run build     # Outputs to dist/
```

The `public/_redirects` file is configured for SPA routing on Netlify. For other hosts (Vercel, Cloudflare Pages), configure equivalent redirect rules to serve `index.html` for all paths.

### Supabase (Production)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations from `supabase/schema.sql`
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy delete-account
   supabase functions deploy send-collaborator-invite
   ```
4. Configure production environment variables:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
5. Enable Realtime on the `note_blocks` table in the Supabase dashboard
6. Set up authentication providers and redirect URLs in the Supabase dashboard

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

## Code Quality

- **TypeScript** — strict mode with full type coverage
- **ESLint** — configured with `typescript-eslint` and React Hooks rules
- **Pre-commit** — run `npm run lint && npm test` before committing

## License

Private — internal use.
