-- ─────────────────────────────────────────────────────────────
-- Seed: Production-ready demo content for local development
-- Run via: supabase db reset (auto-runs seed.sql)
--
-- Users: 4 regular + 1 admin
-- Each user has 2 root folders (general + custom), each with 2 subfolders = 4 subfolders
-- Each subfolder has 1 note with 1 text block
-- Total: 10 root folders, 20 subfolders, 20 notes, 20 note blocks
-- ─────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════
-- 1. USERS (inserted into auth.users so the trigger creates profiles)
-- ═════════════════════════════════════════════════════════════

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  invited_at, confirmation_token, confirmation_sent_at, recovery_token,
  recovery_sent_at, raw_app_meta_data, raw_user_meta_data, created_at,
  updated_at, is_sso_user, is_anonymous,
  last_sign_in_at, email_change_token_new, email_change, email_change_sent_at,
  phone_change_token, phone_change_sent_at, email_change_token_current,
  email_change_confirm_status, reauthentication_token, reauthentication_sent_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',  -- Alex (admin)
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@confluence.test',
    '',
    now(),
    now(), '', now(), '', now(),
    '{}'::jsonb, '{"full_name":"Alex Johnson","avatar_url":null}',
    now(), now(), false, false,
    now(), '', '', now(),
    '', now(), '',
    0, '', now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',  -- Sarah
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sarah@confluence.test',
    '',
    now(),
    now(), '', now(), '', now(),
    '{}'::jsonb, '{"full_name":"Sarah Chen","avatar_url":null}',
    now(), now(), false, false,
    now(), '', '', now(),
    '', now(), '',
    0, '', now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',  -- Marcus
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marcus@confluence.test',
    '',
    now(),
    now(), '', now(), '', now(),
    '{}'::jsonb, '{"full_name":"Marcus Rivera","avatar_url":null}',
    now(), now(), false, false,
    now(), '', '', now(),
    '', now(), '',
    0, '', now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',  -- Priya
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'priya@confluence.test',
    '',
    now(),
    now(), '', now(), '', now(),
    '{}'::jsonb, '{"full_name":"Priya Patel","avatar_url":null}',
    now(), now(), false, false,
    now(), '', '', now(),
    '', now(), '',
    0, '', now()
  ),
  (
    '00000000-0000-0000-0000-000000000005',  -- Emma
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'emma@confluence.test',
    '',
    now(),
    now(), '', now(), '', now(),
    '{}'::jsonb, '{"full_name":"Emma Williams","avatar_url":null}',
    now(), now(), false, false,
    now(), '', '', now(),
    '', now(), '',
    0, '', now()
  )
ON CONFLICT (id) DO NOTHING;

-- The trigger `on_auth_user_created` has fired for each user above,
-- creating profiles (with auto-generated usernames) and a "general" folder per user.
-- The auto-generated usernames from full_name should be:
--   Alex Johnson  → alex-johnson
--   Sarah Chen    → sarah-chen
--   Marcus Rivera → marcus-rivera
--   Priya Patel   → priya-patel
--   Emma Williams → emma-williams
-- All are unique, so no suffixing needed.

-- ═════════════════════════════════════════════════════════════
-- 2. PROMOTE ALEX TO ADMIN
-- ═════════════════════════════════════════════════════════════

UPDATE public.profiles
SET user_type = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ═════════════════════════════════════════════════════════════
-- 3. CUSTOM ROOT FOLDERS (one extra per user, beyond "general")
-- ═════════════════════════════════════════════════════════════

INSERT INTO public.folders (id, owner_id, parent_id, title, description, slug, visibility, created_at, updated_at)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',  -- Alex
    null,
    'System Architecture',
    'Architecture patterns, system design principles, and infrastructure decisions for building scalable applications.',
    'system-architecture',
    'public',
    now() - interval '25 days',
    now() - interval '3 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',  -- Sarah
    null,
    'Data Science',
    'Machine learning, statistical analysis, data visualisation, and analytical workflows.',
    'data-science',
    'public',
    now() - interval '22 days',
    now() - interval '2 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',  -- Marcus
    null,
    'Product Management',
    'Product strategy, roadmaps, user research, and go-to-market planning.',
    'product-management',
    'public',
    now() - interval '20 days',
    now() - interval '4 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',  -- Priya
    null,
    'Creative Writing',
    'Poetry, short stories, essays, and creative non-fiction writing.',
    'creative-writing',
    'public',
    now() - interval '18 days',
    now() - interval '5 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',  -- Emma
    null,
    'Design Portfolio',
    'UX case studies, branding projects, UI designs, and design system documentation.',
    'design-portfolio',
    'public',
    now() - interval '15 days',
    now() - interval '2 days'
  );

-- ═════════════════════════════════════════════════════════════
-- 4. SUBFOLDERS
-- Each root folder gets 2 subfolders.
-- The "general" folders were auto-created by the trigger, so we
-- look them up by owner_id + slug = 'general'.
-- ═════════════════════════════════════════════════════════════

-- 4a. Subfolders under each user's "general" folder
INSERT INTO public.folders (id, owner_id, parent_id, title, description, slug, visibility, created_at, updated_at)
SELECT * FROM (VALUES
  (
    'b1000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000001'),
    'Getting Started',
    'Quick-start guides, onboarding materials, and setup documentation.',
    'getting-started',
    'public'::public.visibility_type,
    now() - interval '24 days',
    now() - interval '2 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000001'),
    'Templates',
    'Reusable note templates for different documentation purposes.',
    'templates',
    'public'::public.visibility_type,
    now() - interval '23 days',
    now() - interval '2 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000002'),
    'Workflows',
    'Daily routines, productivity systems, and process documentation.',
    'workflows',
    'public'::public.visibility_type,
    now() - interval '21 days',
    now() - interval '2 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000002'),
    'Resources',
    'Curated lists of learning materials, tools, and references.',
    'resources',
    'public'::public.visibility_type,
    now() - interval '20 days',
    now() - interval '2 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000003'),
    'Notes',
    'Personal notes, brain dumps, and random thoughts.',
    'notes',
    'public'::public.visibility_type,
    now() - interval '19 days',
    now() - interval '3 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000003'),
    'Bookmarks',
    'Saved links, tools, and resources worth remembering.',
    'bookmarks',
    'public'::public.visibility_type,
    now() - interval '18 days',
    now() - interval '3 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000007'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000004'),
    'Journal',
    'Personal journal entries and reflective writing.',
    'journal',
    'public'::public.visibility_type,
    now() - interval '17 days',
    now() - interval '4 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000008'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000004'),
    'Ideas',
    'Brainstorming, project pitches, and creative concepts.',
    'ideas',
    'public'::public.visibility_type,
    now() - interval '16 days',
    now() - interval '4 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000009'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000005'),
    'Inspiration',
    'Design inspiration, mood boards, and creative references.',
    'inspiration',
    'public'::public.visibility_type,
    now() - interval '14 days',
    now() - interval '1 day'
  ),
  (
    'b1000000-0000-0000-0000-000000000010'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM public.folders WHERE slug = 'general' AND owner_id = '00000000-0000-0000-0000-000000000005'),
    'Sketches',
    'UI sketches, wireframes, and rough design drafts.',
    'sketches',
    'public'::public.visibility_type,
    now() - interval '13 days',
    now() - interval '1 day'
  )
) AS t(id, owner_id, parent_id, title, description, slug, visibility, created_at, updated_at)
WHERE t.parent_id IS NOT NULL;

-- 4b. Subfolders under each custom root folder
INSERT INTO public.folders (id, owner_id, parent_id, title, description, slug, visibility, created_at, updated_at)
VALUES
  -- Alex: System Architecture > Design Patterns, Scaling
  (
    'b2000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Design Patterns',
    'Common architectural patterns, their trade-offs, and real-world use cases.',
    'design-patterns',
    'public',
    now() - interval '24 days',
    now() - interval '3 days'
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Scaling',
    'Horizontal and vertical scaling strategies, load balancing, and caching.',
    'scaling',
    'public',
    now() - interval '23 days',
    now() - interval '3 days'
  ),
  -- Sarah: Data Science > Machine Learning, Visualization
  (
    'b2000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Machine Learning',
    'Model selection, training pipelines, evaluation metrics, and deployment.',
    'machine-learning',
    'public',
    now() - interval '21 days',
    now() - interval '2 days'
  ),
  (
    'b2000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Visualization',
    'Chart types, dashboard design, and data storytelling techniques.',
    'visualization',
    'public',
    now() - interval '20 days',
    now() - interval '2 days'
  ),
  -- Marcus: Product Management > Roadmaps, User Research
  (
    'b2000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'Roadmaps',
    'Quarterly planning, prioritisation frameworks, and stakeholder communication.',
    'roadmaps',
    'public',
    now() - interval '19 days',
    now() - interval '4 days'
  ),
  (
    'b2000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'User Research',
    'Research methodologies, interview scripts, and synthesis techniques.',
    'user-research',
    'public',
    now() - interval '18 days',
    now() - interval '4 days'
  ),
  -- Priya: Creative Writing > Poetry, Short Stories
  (
    'b2000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'Poetry',
    'Original poems, form experiments, and verse collections.',
    'poetry',
    'public',
    now() - interval '17 days',
    now() - interval '5 days'
  ),
  (
    'b2000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'Short Stories',
    'Flash fiction, short narratives, and story drafts.',
    'short-stories',
    'public',
    now() - interval '16 days',
    now() - interval '5 days'
  ),
  -- Emma: Design Portfolio > UX Case Studies, Branding
  (
    'b2000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000005',
    'UX Case Studies',
    'End-to-end case studies documenting the design process.',
    'ux-case-studies',
    'public',
    now() - interval '14 days',
    now() - interval '2 days'
  ),
  (
    'b2000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000005',
    'Branding',
    'Brand identity guidelines, logo explorations, and visual systems.',
    'branding',
    'public',
    now() - interval '13 days',
    now() - interval '2 days'
  );

-- ═════════════════════════════════════════════════════════════
-- 5. NOTES (1 per subfolder = 20 total)
-- Note slugs must be GLOBALLY UNIQUE per the notes_slug_key constraint.
-- Each note is public so it appears on the homepage / notes page.
-- ═════════════════════════════════════════════════════════════

INSERT INTO public.notes (id, folder_id, owner_id, title, description, slug, visibility, created_at, updated_at)
VALUES
  -- Alex: general > Getting Started
  (
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Welcome to Confluence',
    'A quick tour of the platform, its features, and how to get the most out of structured note sharing.',
    'welcome-to-confluence',
    'public',
    now() - interval '24 days',
    now() - interval '2 days'
  ),
  -- Alex: general > Templates
  (
    'a1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Note Template Guide',
    'How to create and use reusable note templates for consistent documentation across your workspace.',
    'note-template-guide',
    'public',
    now() - interval '23 days',
    now() - interval '2 days'
  ),
  -- Alex: System Architecture > Design Patterns
  (
    'a1000000-0000-0000-0000-000000000003',
    'b2000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Common Design Patterns in Modern Applications',
    'A practical overview of singleton, factory, observer, and strategy patterns with real-world code examples.',
    'common-design-patterns',
    'public',
    now() - interval '22 days',
    now() - interval '3 days'
  ),
  -- Alex: System Architecture > Scaling
  (
    'a1000000-0000-0000-0000-000000000004',
    'b2000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Horizontal vs Vertical Scaling',
    'Understanding the trade-offs between scaling up and scaling out, with database and application layer examples.',
    'horizontal-vs-vertical-scaling',
    'public',
    now() - interval '21 days',
    now() - interval '3 days'
  ),
  -- Sarah: general > Workflows
  (
    'a1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'My Daily Workflow Tips',
    'A collection of productivity techniques, time-blocking strategies, and tool configurations I use daily.',
    'my-daily-workflow-tips',
    'public',
    now() - interval '20 days',
    now() - interval '2 days'
  ),
  -- Sarah: general > Resources
  (
    'a1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'Useful Learning Resources',
    'Curated list of books, courses, and articles for deepening your knowledge in data science and engineering.',
    'useful-learning-resources',
    'public',
    now() - interval '19 days',
    now() - interval '2 days'
  ),
  -- Sarah: Data Science > Machine Learning
  (
    'a1000000-0000-0000-0000-000000000007',
    'b2000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'ML Model Selection Guide',
    'How to choose the right machine learning model for classification, regression, clustering, and recommendation tasks.',
    'ml-model-selection-guide',
    'public',
    now() - interval '18 days',
    now() - interval '2 days'
  ),
  -- Sarah: Data Science > Visualization
  (
    'a1000000-0000-0000-0000-000000000008',
    'b2000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'Data Visualization Best Practices',
    'Principles for creating clear, impactful charts and dashboards that communicate insights effectively.',
    'data-visualization-best-practices',
    'public',
    now() - interval '17 days',
    now() - interval '2 days'
  ),
  -- Marcus: general > Notes
  (
    'a1000000-0000-0000-0000-000000000009',
    'b1000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    'Random Thoughts Collection',
    'A running log of observations, ideas, and insights from my day-to-day work as a product manager.',
    'random-thoughts-collection',
    'public',
    now() - interval '16 days',
    now() - interval '3 days'
  ),
  -- Marcus: general > Bookmarks
  (
    'a1000000-0000-0000-0000-000000000010',
    'b1000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000003',
    'My Favorite Dev Tools',
    'A curated list of tools, libraries, and platforms that make development faster and more enjoyable.',
    'favorite-dev-tools',
    'public',
    now() - interval '15 days',
    now() - interval '3 days'
  ),
  -- Marcus: Product Management > Roadmaps
  (
    'a1000000-0000-0000-0000-000000000011',
    'b2000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    'Q3 Product Roadmap',
    'Strategic priorities, feature themes, and OKRs for the third quarter across all product verticals.',
    'q3-product-roadmap',
    'public',
    now() - interval '14 days',
    now() - interval '4 days'
  ),
  -- Marcus: Product Management > User Research
  (
    'a1000000-0000-0000-0000-000000000012',
    'b2000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000003',
    'User Interview Techniques',
    'Effective methods for conducting user interviews, from recruiting participants to synthesising findings.',
    'user-interview-techniques',
    'public',
    now() - interval '13 days',
    now() - interval '4 days'
  ),
  -- Priya: general > Journal
  (
    'a1000000-0000-0000-0000-000000000013',
    'b1000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000004',
    'Weekly Journal Entry',
    'Reflections on the past week, lessons learned, and intentions for the days ahead.',
    'weekly-journal-entry',
    'public',
    now() - interval '12 days',
    now() - interval '4 days'
  ),
  -- Priya: general > Ideas
  (
    'a1000000-0000-0000-0000-000000000014',
    'b1000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000004',
    'Project Ideas for 2026',
    'A brainstorming list of creative projects, writing challenges, and collaboration opportunities for next year.',
    'project-ideas-2026',
    'public',
    now() - interval '11 days',
    now() - interval '4 days'
  ),
  -- Priya: Creative Writing > Poetry
  (
    'a1000000-0000-0000-0000-000000000015',
    'b2000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000004',
    'A Collection of Poems',
    'Original poetry exploring themes of nature, technology, and the spaces between them.',
    'collection-of-poems',
    'public',
    now() - interval '10 days',
    now() - interval '5 days'
  ),
  -- Priya: Creative Writing > Short Stories
  (
    'a1000000-0000-0000-0000-000000000016',
    'b2000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000004',
    'Flash Fiction: The Last Light',
    'A short story about the final sunset on a distant planet, told through the eyes of the last botanist.',
    'flash-fiction-last-light',
    'public',
    now() - interval '9 days',
    now() - interval '5 days'
  ),
  -- Emma: general > Inspiration
  (
    'a1000000-0000-0000-0000-000000000017',
    'b1000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000005',
    'Design Inspiration Links',
    'A running collection of beautifully designed websites, Dribbble shots, and design system references.',
    'design-inspiration-links',
    'public',
    now() - interval '8 days',
    now() - interval '1 day'
  ),
  -- Emma: general > Sketches
  (
    'a1000000-0000-0000-0000-000000000018',
    'b1000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000005',
    'UI Sketch Ideas',
    'Wireframes and rough UI concepts for a reimagined project management dashboard interface.',
    'ui-sketch-ideas',
    'public',
    now() - interval '7 days',
    now() - interval '1 day'
  ),
  -- Emma: Design Portfolio > UX Case Studies
  (
    'a1000000-0000-0000-0000-000000000019',
    'b2000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000005',
    'Redesigning a SaaS Dashboard',
    'A complete UX case study covering user research, information architecture, prototyping, and usability testing.',
    'redesigning-saas-dashboard',
    'public',
    now() - interval '6 days',
    now() - interval '2 days'
  ),
  -- Emma: Design Portfolio > Branding
  (
    'a1000000-0000-0000-0000-000000000020',
    'b2000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000005',
    'Brand Identity Guidelines',
    'Comprehensive brand guidelines covering logo usage, colour palette, typography, tone of voice, and application examples.',
    'brand-identity-guidelines',
    'public',
    now() - interval '5 days',
    now() - interval '2 days'
  );

-- ═════════════════════════════════════════════════════════════
-- 6. NOTE BLOCKS (1 text block per note = 20 blocks)
-- ═════════════════════════════════════════════════════════════

INSERT INTO public.note_blocks (note_id, type, content, order_index, metadata)
VALUES
  -- 1. Welcome to Confluence
  (
    'a1000000-0000-0000-0000-000000000001',
    'text',
    E'Welcome to Confluence — your structured note-sharing platform.\n\nHere is what you can do:\n\n- **Create folders** to organise your notes by topic or project\n- **Add subfolders** to build a hierarchy that matches your thinking\n- **Write notes** using rich text blocks, code blocks, images, and videos\n- **Control visibility** per folder or per note (public or private)\n- **Share links** with anyone using clean, permanent URLs\n\nStart by creating your first folder, then add some notes. The block editor supports markdown-style formatting, syntax-highlighted code, and embedded media.\n\nHappy writing!',
    0,
    '{}'
  ),
  -- 2. Note Template Guide
  (
    'a1000000-0000-0000-0000-000000000002',
    'text',
    E'Using templates helps maintain consistency across your notes. Here is a recommended structure:\n\n## Meeting Notes Template\n- **Date:** [date]\n- **Attendees:** [names]\n- **Agenda:** [list of topics]\n- **Discussion:** [key points]\n- **Action Items:** [tasks with owners]\n- **Next Meeting:** [date]\n\n## Project Note Template\n- **Project:** [name]\n- **Status:** [active | completed | paused]\n- **Goals:** [list of objectives]\n- **Timeline:** [key milestones]\n- **Dependencies:** [linked notes or folders]\n- **Notes:** [free-form content]\n\nYou can duplicate any note and strip its content to create a reusable template.',
    0,
    '{}'
  ),
  -- 3. Common Design Patterns
  (
    'a1000000-0000-0000-0000-000000000003',
    'text',
    E'Design patterns are reusable solutions to common software design problems.\n\n## Singleton\nEnsures a class has only one instance and provides a global point of access.\n\n```ts\nclass Database {\n  private static instance: Database;\n  private constructor() {}\n  static getInstance(): Database {\n    if (!Database.instance) {\n      Database.instance = new Database();\n    }\n    return Database.instance;\n  }\n}\n```\n\n## Observer\nDefines a one-to-many dependency so that when one object changes state, all its dependents are notified.\n\n## Factory Method\nDefines an interface for creating an object, but lets subclasses decide which class to instantiate.\n\n## Strategy\nEnables selecting an algorithm at runtime. Useful for payment processing, sorting, or validation logic.',
    0,
    '{}'
  ),
  -- 4. Horizontal vs Vertical Scaling
  (
    'a1000000-0000-0000-0000-000000000004',
    'text',
    E'## Vertical Scaling (Scale Up)\nAdd more power to an existing machine (CPU, RAM, storage).\n\n**Pros:** Simple, no code changes, lower operational complexity.\n**Cons:** Hardware limits, expensive at high end, single point of failure.\n\n## Horizontal Scaling (Scale Out)\nAdd more machines to distribute the load.\n\n**Pros:** Virtually unlimited, cost-effective, fault-tolerant.\n**Cons:** Requires load balancers, eventual consistency challenges, more complex infrastructure.\n\n### When to Use Which?\n- Start with vertical scaling for simplicity\n- Move to horizontal when you hit resource limits or need high availability\n- Databases often scale vertically first; application servers scale horizontally\n\n### Caching Layer\nAdding a cache (Redis, Memcached) between the application and database can significantly reduce load without scaling either vertically.',
    0,
    '{}'
  ),
  -- 5. My Daily Workflow Tips
  (
    'a1000000-0000-0000-0000-000000000005',
    'text',
    E'Over the years I have refined my daily workflow to maximise focus and minimise context switching.\n\n## Morning Routine\n1. Review calendar and prioritise top 3 tasks for the day\n2. Check and respond to urgent messages (15 min max)\n3. Deep work block: 90 minutes on the most important task\n4. Short break (5-10 min)\n\n## Afternoon\n1. Meetings and collaboration (batch them together)\n2. Lighter tasks: code reviews, documentation, emails\n3. Plan next day: write down tomorrow\'s top 3 priorities\n\n## Tools I Use\n- **Notes:** Confluence (of course!)\n- **Tasks:** Linear for engineering, Notion for personal\n- **Calendar:** Time-blocking with Google Calendar\n- **Focus:** Forest app for pomodoro sessions',
    0,
    '{}'
  ),
  -- 6. Useful Learning Resources
  (
    'a1000000-0000-0000-0000-000000000006',
    'text',
    E'A curated list of resources I recommend for anyone looking to level up in data science and software engineering.\n\n## Books\n- "Designing Data-Intensive Applications" by Martin Kleppmann\n- "The Pragmatic Programmer" by Andy Hunt & Dave Thomas\n- "Storytelling with Data" by Cole Nussbaumer Knaflic\n\n## Online Courses\n- CS229 Machine Learning (Stanford / Andrew Ng)\n- MIT 6.824 Distributed Systems\n- Fast.ai Practical Deep Learning\n\n## Podcasts\n- Data Skeptic\n- Software Engineering Daily\n- Linear Digressions\n\n## Newsletters\n- TLDR Newsletter (daily tech news)\n- The Algorithm (MIT Technology Review)',
    0,
    '{}'
  ),
  -- 7. ML Model Selection Guide
  (
    'a1000000-0000-0000-0000-000000000007',
    'text',
    E'Choosing the right machine learning model depends on your data type, problem type, and constraints.\n\n## Classification\n- **Logistic Regression:** Binary classification, interpretable\n- **Random Forest:** Multi-class, handles non-linear relationships\n- **XGBoost:** State-of-the-art for tabular data\n- **Neural Networks:** Image, text, or complex patterns\n\n## Regression\n- **Linear Regression:** Simple relationships\n- **Ridge/Lasso:** When features are correlated\n- **Gradient Boosting:** Non-linear relationships with high accuracy\n\n## Clustering\n- **K-Means:** Simple, scales well\n- **DBSCAN:** Handles arbitrary shapes, detects outliers\n- **Hierarchical:** When you need a dendrogram\n\n## Recommendation\n- **Collaborative Filtering:** User-item interactions\n- **Matrix Factorization:** Latent feature discovery\n- **Neural Collaborative Filtering:** Deep learning approach',
    0,
    '{}'
  ),
  -- 8. Data Visualization Best Practices
  (
    'a1000000-0000-0000-0000-000000000008',
    'text',
    E'Good data visualisation tells a story clearly and honestly. Here are the principles I follow:\n\n## 1. Choose the Right Chart\n- **Bar chart:** Compare categories\n- **Line chart:** Show trends over time\n- **Scatter plot:** Show relationships between variables\n- **Heatmap:** Show density or correlation\n- **Donut/Pie:** Show proportions (use sparingly)\n\n## 2. Reduce Clutter\n- Remove gridlines that don\'t add value\n- Use colour sparingly and meaningfully\n- Label directly instead of using legends when possible\n\n## 3. Tell a Story\n- Start with a clear title that states the insight\n- Add annotations for key data points\n- Guide the viewer\'s eye with visual hierarchy\n\n## 4. Be Honest\n- Start y-axis at zero for bar charts\n- Don\'t cherry-pick time ranges\n- Show uncertainty when it exists',
    0,
    '{}'
  ),
  -- 9. Random Thoughts Collection
  (
    'a1000000-0000-0000-0000-000000000009',
    'text',
    E'A running log of thoughts and observations from my work as a product manager.\n\n## On Product Discovery\nThe best products solve problems people didn\'t know they had. The challenge is validating that the problem is real before building.\n\n## On Stakeholder Management\nThe key to good stakeholder relationships is over-communication. Share context early, share bad news faster, and always tie decisions back to user impact.\n\n## On Prioritisation\nSaying no to good ideas is harder than saying no to bad ones. Every yes is a no to something else.\n\n## On Team Culture\nPsychological safety is the foundation of high-performing teams. If people don\'t feel safe sharing dissenting opinions, you\'re making worse decisions.',
    0,
    '{}'
  ),
  -- 10. My Favorite Dev Tools
  (
    'a1000000-0000-0000-0000-000000000010',
    'text',
    E'Tools that make my development workflow faster and more enjoyable:\n\n## Editor\n- **VS Code:** With vim keybindings, GitHub Copilot, and Prettier\n\n## Terminal\n- **Warp:** GPU-accelerated terminal with AI features\n- **Oh My Zsh:** With powerlevel10k theme\n\n## Version Control\n- **GitHub Desktop:** For visual diffs\n- **GitLens:** VS Code extension for blame annotations\n\n## API Development\n- **Bruno:** Open-source API client (alternative to Postman)\n- **httpie:** Command-line HTTP client\n\n## Containers\n- **Docker Desktop:** For local development\n- **OrbStack:** Faster Docker alternative for macOS\n\n## Productivity\n- **Raycast:** Spotlight replacement with extensions\n- **Rectangle:** Window management shortcuts',
    0,
    '{}'
  ),
  -- 11. Q3 Product Roadmap
  (
    'a1000000-0000-0000-0000-000000000011',
    'text',
    E'## Q3 2026 — Strategic Priorities\n\n### Theme: Scale & Personalise\n\n### OKR 1: Performance\n- P95 API response time under 200ms\n- Zero downtime deployments\n- CDN integration for static assets\n\n### OKR 2: Personalisation\n- User preference system\n- Custom dashboard layouts\n- Smart notifications\n\n### OKR 3: Collaboration\n- Real-time co-editing (beta)\n- Comment threads on blocks\n- Team workspaces\n\n### Timeline\n- **July:** Infrastructure upgrades, CDN setup\n- **August:** Personalisation engine, user preferences\n- **September:** Collaboration beta, performance QA\n\n### Risks\n- Co-editing sync complexity might push to Q4\n- Hiring timeline for backend engineers is tight',
    0,
    '{}'
  ),
  -- 12. User Interview Techniques
  (
    'a1000000-0000-0000-0000-000000000012',
    'text',
    E'Conducting effective user interviews requires preparation, active listening, and structured synthesis.\n\n## Before the Interview\n1. Define research goals — what decisions will this inform?\n2. Write a discussion guide with open-ended questions\n3. Recruit 5-8 participants per persona segment\n4. Set up recording (with consent)\n\n## During the Interview\n- Start with easy, non-threatening questions\n- Use the "five whys" technique to dig deeper\n- Ask about specific past behaviours, not hypotheticals\n- Watch for body language and emotional cues\n- Stay silent after the participant finishes — they often add more\n\n## After the Interview\n1. Transcribe and tag within 24 hours\n2. Create affinity maps to identify patterns\n3. Write a one-page summary per session\n4. Share clips with the team\n\n## Common Pitfalls\n- Leading questions ("Don\'t you think X is better?")\n- Confirmation bias — only hearing what supports your hypothesis\n- Not recruiting enough diverse participants',
    0,
    '{}'
  ),
  -- 13. Weekly Journal Entry
  (
    'a1000000-0000-0000-0000-000000000013',
    'text',
    E'## Week of June 1 - June 7\n\n### Highlights\n- Finally shipped the new onboarding flow after three weeks of iteration\n- Received positive feedback from early testers on the simplified UI\n- Had a great mentoring session with a junior designer on the team\n\n### Challenges\n- Stakeholder alignment on the Q3 priorities took longer than expected\n- Struggled with maintaining focus during deep work blocks\n- Need to improve my delegation skills — taking on too much myself\n\n### Lessons Learned\n1. Done is better than perfect — the onboarding flow could have shipped a week earlier\n2. Written proposals save hours of meeting time for alignment discussions\n3. Taking a proper lunch break improves afternoon productivity significantly\n\n### Next Week\'s Intentions\n- Delegate at least 2 tasks to team members\n- Block 3 hours of uninterrupted deep work daily\n- Read "Inspired" by Marty Cagan',
    0,
    '{}'
  ),
  -- 14. Project Ideas for 2026
  (
    'a1000000-0000-0000-0000-000000000014',
    'text',
    E'A brainstorming list of creative projects I want to explore:\n\n## Writing Projects\n- A collection of micro-essays about life in tech (12 pieces)\n- 30-day poetry challenge: one poem per day for a month\n- A short story anthology themed around "future folklore"\n\n## Collaboration Ideas\n- Start a local writers\' circle meeting bi-weekly\n- Collaborate with a visual artist on a poetry + illustration zine\n- Run a community writing sprint on Confluence\n\n## Skill Development\n- Learn screenwriting fundamentals\n- Take an online course on creative non-fiction\n- Experiment with interactive fiction (Twine)\n\n## Personal Challenges\n- Write 500 words daily for 100 days\n- Read 24 books in 2026 (fiction + non-fiction mix)\n- Submit work to at least 3 literary magazines',
    0,
    '{}'
  ),
  -- 15. A Collection of Poems
  (
    'a1000000-0000-0000-0000-000000000015',
    'text',
    E'## Binary Garden\n\nIn the garden of ones and zeros,\nwhere logic gates bloom like flowers,\nI planted seeds of thought\nand watered them with wonder.\n\nThe branches grow in patterns\nfractal, recursive, deep —\na tree that knows itself,\nwhose roots are made of light.\n\n## Terminal\n\nA blinking cursor on a black screen:\nthe universe\'s pause button.\nI type my questions into the void\nand wait for echoes.\n\n## API of the Heart\n\nPOST to the endpoint of connection,\nauthentication required,\nbut the token keeps expiring\nand I forget to refresh.\n\nError handling is poor here:\nwhen the response comes back 404,\nI keep polling,\nhoping for a different status code.',
    0,
    '{}'
  ),
  -- 16. Flash Fiction: The Last Light
  (
    'a1000000-0000-0000-0000-000000000016',
    'text',
    E'Elara adjusted her helmet and stepped onto the surface of Kepler-442b for the last time.\n\nThe star was dying. She had known this day would come — the models had predicted it with 99.7% confidence — but knowing and experiencing were different things entirely.\n\nThe sky was a deep violet, streaked with orange where the shrinking sun struggled to hold on. The bioluminescent moss that covered the valley floor pulsed weakly, responding to light that was barely there anymore.\n\nShe knelt and placed her gloved hand on the moss. Even through the suit\'s insulation, she could feel its warmth fading.\n\n"Forty-three years," she whispered. "That\'s how long your light has been travelling to reach us."\n\nHer botanical samples were already packed. Twenty-seven species of extremophile flora, each one a miracle of adaptation, each one now an orphan of a dying star.\n\nThe Earth would study them, preserve them. But they would never see this sky again.\n\nElara stood, took one last photograph, and turned toward the lander.\n\nBehind her, Kepler-442b\'s final sunset painted the world in colours that no human would ever see again.',
    0,
    '{}'
  ),
  -- 17. Design Inspiration Links
  (
    'a1000000-0000-0000-0000-000000000017',
    'text',
    E'A collection of design references I come back to again and again:\n\n## Design Systems\n- **Radix UI** — Primitive components with excellent accessibility\n- **Shadcn/ui** — Beautifully designed components, copy-paste friendly\n- **Polaris** (Shopify) — Great patterns for complex admin interfaces\n\n## Portfolio Inspiration\n- **brunoarizio.com** — Clean typography and layout\n- **brittanychiang.com** — Perfect balance of personality and professionalism\n\n## UI Patterns\n- **UI Garage** — Curated collection of UI patterns\n- **Mobbin** — Real app screenshots for research\n- **Godly** — Award-winning website designs\n\n## Typography\n- **Typewolf** — Font pairing recommendations\n- **Fonts In Use** — Real-world typography examples\n\n## Colour\n- **Coolors** — Fast palette generation\n- **Realtime Colors** — See colour schemes applied to UI instantly',
    0,
    '{}'
  ),
  -- 18. UI Sketch Ideas
  (
    'a1000000-0000-0000-0000-000000000018',
    'text',
    E'Rough concepts for reimagining a project management dashboard:\n\n## Dashboard Redesign Concepts\n\n### 1. Context-First Layout\nInstead of a generic dashboard, show a personalised view based on role:\n- **Developer:** Recent PRs, build status, assigned issues\n- **Designer:** Pending reviews, design handoffs, feedback threads\n- **PM:** Roadmap timeline, blocked tasks, team velocity\n\n### 2. Activity Timeline\nReplace the standard list view with a vertical timeline showing:\n- Task status changes with diffs\n- Comments and decisions\n- File uploads and design iterations\n- Auto-generated weekly summaries\n\n### 3. Focus Mode\nA distraction-free view that shows only:\n- Current sprint tasks\n- Upcoming deadlines (next 7 days)\n- One key metric (velocity or burndown)\n\n### 4. Quick Actions\nFloating action bar with smart suggestions:\n- "You have 3 PRs to review →"\n- "Sprint ends in 2 days → View burndown"\n- "Standup in 15 min → Prepare update"\n\nThese are rough wireframe concepts — next step is to prototype in Figma.',
    0,
    '{}'
  ),
  -- 19. Redesigning a SaaS Dashboard
  (
    'a1000000-0000-0000-0000-000000000019',
    'text',
    E'## Project Overview\n**Client:** DataPulse Analytics (B2B SaaS)\n**Role:** Lead Product Designer\n**Timeline:** 12 weeks\n**Team:** 2 designers, 1 PM, 3 engineers\n\n## The Problem\nUsers reported that the dashboard was overwhelming — too many widgets, unclear hierarchy, and no personalisation. Task completion rate for common actions was below 60%.\n\n## Research\n- Conducted 12 user interviews with existing customers\n- Analysed product analytics (session recordings, click maps)\n- Competitive analysis of 5 competitor dashboards\n\n## Key Findings\n1. Users only used 3 of 12 available widgets regularly\n2. Most users couldn\'t find the "export" function without help\n3. Power users wanted keyboard shortcuts and custom layouts\n\n## Design Process\n\n### Information Architecture\nRestructured the dashboard into three tiers:\n- **Tier 1 (Always visible):** Key metrics, notifications, search\n- **Tier 2 (One click):** Reports, settings, integrations\n- **Tier 3 (Contextual):** Admin panels, audit logs\n\n### Prototyping\nCreated high-fidelity prototypes in Figma and ran 3 rounds of usability testing with 18 participants.\n\n### Results\n- Task completion rate improved from 58% to 92%\n- User satisfaction score (CSAT) increased by 34%\n- Support tickets related to navigation dropped by 47%',
    0,
    '{}'
  ),
  -- 20. Brand Identity Guidelines
  (
    'a1000000-0000-0000-0000-000000000020',
    'text',
    E'# Brand Identity Guidelines\n\n## Logo\n- **Primary:** Full logo with icon and wordmark\n- **Secondary:** Icon-only (favicon, app icon)\n- **Minimum clear space:** Equal to the height of the icon on all sides\n- **Do not:** Stretch, recolour (outside approved palette), or add shadows\n\n## Colour Palette\n- **Primary:** #0D7F66 (Teal)\n- **Secondary:** #4F46E5 (Indigo)\n- **Accent:** #B87009 (Amber)\n- **Neutral:** #1A1A2E (Dark), #F8F9FA (Light)\n- **Success:** #059669\n- **Error:** #DC2626\n\n## Typography\n- **Headings:** Inter, sans-serif (weights 600-700)\n- **Body:** Inter, sans-serif (weight 400)\n- **Code:** JetBrains Mono, monospace\n- **Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 48 px\n\n## Tone of Voice\n- Clear and direct — avoid jargon\n- Professional but warm — not overly formal\n- Confident but humble — we\'re still learning\n- Use active voice and short sentences',
    0,
    '{}'
  );
