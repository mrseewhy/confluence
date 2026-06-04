-- ─────────────────────────────────────────────────────────────
-- Seed: Demo content for local development
-- Run via: supabase db reset (auto-runs seed.sql)
-- ─────────────────────────────────────────────────────────────

-- ── Demo Users (inserted into auth.users so the trigger creates profiles) ──

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_sent_at, is_sso_user, is_anonymous)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@confluence.test',
    '',
    now(),
    '{"full_name":"Alex Johnson","avatar_url":null}',
    now(),
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sarah@confluence.test',
    '',
    now(),
    '{"full_name":"Sarah Chen","avatar_url":null}',
    now(),
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marcus@confluence.test',
    '',
    now(),
    '{"full_name":"Marcus Rivera","avatar_url":null}',
    now(),
    now(),
    now(),
    false,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- The trigger `on_auth_user_created` on auth.users has already fired,
-- creating profiles and a 'general' folder for each user above.
-- We delete the auto-created 'general' folders since they clutter the public view.
DELETE FROM public.folders WHERE slug = 'general' AND owner_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Backfill usernames for seed profiles (trigger doesn't set them)
UPDATE public.profiles SET username = 'alex-johnson'   WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET username = 'sarah-chen'     WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET username = 'marcus-rivera'  WHERE id = '00000000-0000-0000-0000-000000000003';

-- ── Root Folders ─────────────────────────────────────────────────────────

INSERT INTO public.folders (id, owner_id, parent_id, title, description, slug, visibility, created_at, updated_at)
VALUES
  (
    'f1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001', -- Alex
    null,
    'Full Stack Development',
    'Everything you need to build modern web applications end to end — from frontend frameworks to backend APIs and databases.',
    'full-stack-development',
    'public',
    now() - interval '30 days',
    now() - interval '2 days'
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000002', -- Sarah
    null,
    'System Design',
    'Architecture patterns, scalability, distributed systems, and trade-off analysis for senior engineers.',
    'system-design',
    'public',
    now() - interval '25 days',
    now() - interval '3 days'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000003', -- Marcus
    null,
    'DevOps & Deployment',
    'CI/CD pipelines, Docker, Kubernetes, monitoring, and cloud infrastructure automation.',
    'devops-deployment',
    'public',
    now() - interval '20 days',
    now() - interval '5 days'
  );

-- ── Subfolders ───────────────────────────────────────────────────────────

INSERT INTO public.folders (id, owner_id, parent_id, title, description, slug, visibility, created_at, updated_at)
VALUES
  -- Full Stack Development > Frontend
  (
    'f1111aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'f1111111-1111-1111-1111-111111111111',
    'Frontend',
    'React, TypeScript, Tailwind CSS, and modern UI patterns.',
    'frontend',
    'public',
    now() - interval '28 days',
    now() - interval '2 days'
  ),
  -- Full Stack Development > Backend
  (
    'f1111bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000001',
    'f1111111-1111-1111-1111-111111111111',
    'Backend',
    'Node.js, Express, databases, and API design.',
    'backend',
    'public',
    now() - interval '27 days',
    now() - interval '2 days'
  ),
  -- System Design > Database Design
  (
    'f2222aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000002',
    'f2222222-2222-2222-2222-222222222222',
    'Database Design',
    'Schema design, indexing strategies, normalisation, and query optimisation.',
    'database-design',
    'public',
    now() - interval '22 days',
    now() - interval '3 days'
  ),
  -- System Design > Microservices
  (
    'f2222bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000002',
    'f2222222-2222-2222-2222-222222222222',
    'Microservices',
    'Event-driven architecture, service discovery, and inter-service communication.',
    'microservices',
    'public',
    now() - interval '21 days',
    now() - interval '3 days'
  ),
  -- DevOps > Docker & Containers
  (
    'f3333aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000003',
    'f3333333-3333-3333-3333-333333333333',
    'Docker & Containers',
    'Containerisation, Docker Compose, multi-stage builds, and best practices.',
    'docker-containers',
    'public',
    now() - interval '18 days',
    now() - interval '5 days'
  ),
  -- DevOps > CI/CD
  (
    'f3333bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000003',
    'f3333333-3333-3333-3333-333333333333',
    'CI/CD',
    'GitHub Actions, automated testing, deployment pipelines, and release strategies.',
    'cicd',
    'public',
    now() - interval '17 days',
    now() - interval '5 days'
  );

-- ── Notes ─────────────────────────────────────────────────────────────────

INSERT INTO public.notes (id, folder_id, owner_id, title, description, slug, visibility, created_at, updated_at)
VALUES
  -- 1. Full Stack > Frontend
  (
    'a0000001-0000-0000-0000-000000000001',
    'f1111aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'How to Set Up a React Project with Vite',
    'Step-by-step guide to scaffolding a modern React project with Vite, TypeScript, and Tailwind CSS from scratch.',
    'how-to-set-up-a-react-project-with-vite',
    'public',
    now() - interval '28 days',
    now() - interval '2 days'
  ),
  -- 2. Full Stack > Frontend
  (
    'a0000002-0000-0000-0000-000000000002',
    'f1111aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'React 19 — What Changed',
    'A deep dive into the new features in React 19: use() hook, Actions, the new compiler, and improved concurrent rendering.',
    'react-19-what-changed',
    'public',
    now() - interval '15 days',
    now() - interval '1 day'
  ),
  -- 3. Full Stack > Backend
  (
    'a0000003-0000-0000-0000-000000000003',
    'f1111bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000001',
    'JWT Authentication in Express',
    'How to sign, verify, and refresh JSON Web Tokens for secure API access in Node.js and Express applications.',
    'jwt-authentication-in-express',
    'public',
    now() - interval '25 days',
    now() - interval '3 days'
  ),
  -- 4. System Design (root)
  (
    'a0000004-0000-0000-0000-000000000004',
    'f2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000002',
    'CAP Theorem Explained Simply',
    'Understanding consistency, availability, and partition tolerance in distributed systems with real-world database examples.',
    'cap-theorem-explained-simply',
    'public',
    now() - interval '22 days',
    now() - interval '4 days'
  ),
  -- 5. System Design > Database Design
  (
    'a0000005-0000-0000-0000-000000000005',
    'f2222aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000002',
    'Database Indexing Strategies',
    'B-tree, hash, and full-text indexes — when to use each, how to analyse query performance, and common pitfalls.',
    'database-indexing-strategies',
    'public',
    now() - interval '18 days',
    now() - interval '4 days'
  ),
  -- 6. System Design > Microservices
  (
    'a0000006-0000-0000-0000-000000000006',
    'f2222bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000002',
    'Event-Driven Architecture Patterns',
    'Event sourcing, CQRS, message brokers, and when to choose asynchronous communication between services.',
    'event-driven-architecture-patterns',
    'public',
    now() - interval '14 days',
    now() - interval '1 day'
  ),
  -- 7. DevOps > Docker & Containers
  (
    'a0000007-0000-0000-0000-000000000007',
    'f3333aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000003',
    'Docker Compose for Local Development',
    'Multi-service setups made easy with Docker Compose — networking, volumes, environment variables, and health checks.',
    'docker-compose-for-local-development',
    'public',
    now() - interval '16 days',
    now() - interval '6 days'
  ),
  -- 8. DevOps > CI/CD
  (
    'a0000008-0000-0000-0000-000000000008',
    'f3333bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000003',
    'Setting Up GitHub Actions CI/CD',
    'Build a production-grade CI/CD pipeline with GitHub Actions — linting, testing, building, and deploying to the cloud.',
    'setting-up-github-actions-cicd',
    'public',
    now() - interval '12 days',
    now() - interval '6 days'
  );

-- ── Note Blocks ───────────────────────────────────────────────────────────

INSERT INTO public.note_blocks (note_id, type, content, order_index, metadata)
VALUES
  -- Note 1: React + Vite
  (
    'a0000001-0000-0000-0000-000000000001',
    'text',
    'Vite is a modern build tool that provides a fast development server and optimized production builds. To get started, run:\n\n```bash\nnpm create vite@latest my-app -- --template react-ts\ncd my-app\nnpm install\nnpm run dev\n```\n\nThis scaffolds a React + TypeScript project with hot module replacement out of the box.',
    0,
    '{}'
  ),
  (
    'a0000001-0000-0000-0000-000000000001',
    'text',
    'Next, add Tailwind CSS for utility-first styling:\n\n```bash\nnpm install -D tailwindcss @tailwindcss/vite\n```\n\nConfigure the Vite plugin and you are ready to build responsive UIs with zero runtime overhead.',
    1,
    '{}'
  ),
  -- Note 2: React 19
  (
    'a0000002-0000-0000-0000-000000000002',
    'text',
    'React 19 introduces the **use()** hook which lets you read resources like promises and context directly inside render. This simplifies data fetching significantly:\n\n```tsx\nfunction Comments({ promise }) {\n  const comments = use(promise);\n  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>;\n}\n```\n\nThe new React Compiler automatically memoizes components, reducing the need for useMemo and useCallback.',
    0,
    '{}'
  ),
  -- Note 3: JWT Auth
  (
    'a0000003-0000-0000-0000-000000000003',
    'text',
    'JSON Web Tokens are the standard for stateless API authentication. Here is a minimal Express setup using the `jsonwebtoken` library:\n\n```js\nconst jwt = require(\"jsonwebtoken\");\n\nfunction signToken(userId) {\n  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {\n    expiresIn: \"15m\",\n  });\n}\n\nfunction verifyToken(token) {\n  return jwt.verify(token, process.env.JWT_SECRET);\n}\n```\n\nAlways use refresh tokens with short-lived access tokens for security.',
    0,
    '{}'
  ),
  -- Note 4: CAP Theorem
  (
    'a0000004-0000-0000-0000-000000000004',
    'text',
    'The CAP theorem states that a distributed data store can only provide two of three guarantees simultaneously:\n\n- **Consistency** — every read receives the most recent write\n- **Availability** — every request receives a non-error response\n- **Partition Tolerance** — the system continues to operate despite network failures\n\nIn practice, networks are unreliable, so you must choose between CP and AP systems.',
    0,
    '{}'
  ),
  (
    'a0000004-0000-0000-0000-000000000004',
    'text',
    '**CP systems** (like HBase, MongoDB with write concern majority) favour consistency over availability during a partition. **AP systems** (like Cassandra, CouchDB) favour availability and accept eventual consistency. Your choice depends on your application requirements.',
    1,
    '{}'
  ),
  -- Note 5: Indexing
  (
    'a0000005-0000-0000-0000-000000000005',
    'text',
    'Database indexes are data structures that improve the speed of data retrieval. The most common types are:\n\n- **B-tree indexes** — good for equality and range queries (default in PostgreSQL)\n- **Hash indexes** — optimal for equality lookups only\n- **GIN indexes** — designed for full-text search and array columns\n\n```sql\nCREATE INDEX idx_users_email ON users USING btree (email);\nCREATE INDEX idx_articles_fts ON articles USING gin(to_tsvector(\"english\", body));\n```',
    0,
    '{}'
  ),
  -- Note 6: Event-Driven Architecture
  (
    'a0000006-0000-0000-0000-000000000006',
    'text',
    'Event-driven architecture decouples services through asynchronous event communication. Key patterns include:\n\n1. **Event Sourcing** — store state changes as an immutable log of events\n2. **CQRS** — separate read models from write models for optimised queries\n3. **Message Brokers** — use RabbitMQ, Kafka, or AWS SQS to buffer and route events\n\nThis approach improves scalability and resilience, since services can fail independently.',
    0,
    '{}'
  ),
  -- Note 7: Docker Compose
  (
    'a0000007-0000-0000-0000-000000000007',
    'text',
    'Docker Compose lets you define and run multi-container applications with a single YAML file:\n\n```yaml\nservices:\n  api:\n    build: ./api\n    ports:\n      - \"4000:4000\"\n    depends_on:\n      - db\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: myapp\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\nvolumes:\n  pgdata:\n```\n\nRun `docker compose up` to start everything together.',
    0,
    '{}'
  ),
  (
    'a0000007-0000-0000-0000-000000000007',
    'text',
    'For local development, use health checks to wait for dependent services:\n\n```yaml\napi:\n  healthcheck:\n    test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:4000/health\"]\n    interval: 10s\n    timeout: 5s\n    retries: 5\n```',
    1,
    '{}'
  ),
  -- Note 8: GitHub Actions
  (
    'a0000008-0000-0000-0000-000000000008',
    'text',
    'A production-ready GitHub Actions workflow typically includes linting, testing, building, and deployment:\n\n```yaml\nname: CI/CD\non:\n  push:\n    branches: [main]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm ci\n      - run: npm test\n  deploy:\n    needs: test\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo \"Deploying...\"\n```',
    0,
    '{}'
  );
