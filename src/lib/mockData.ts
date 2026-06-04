import type { Folder, Note, Profile } from '@/types'

// ── Mock current user ─────────────────────────────────────────

export const mockCurrentUser: Profile = {
  id: 'user-1',
  full_name: 'Alex Johnson',
  username: 'alex-johnson',
  avatar_url: null,
  user_type: 'admin',
  created_at: '2024-10-01T00:00:00Z',
}

// ── Collaborators Schema ──────────────────────────────────────

export interface MockCollaborator {
  id: string
  inviter_id: string
  invitee_email: string
  folder_id?: string | null
  note_id?: string | null
  access_level: 'viewer' | 'editor'
  created_at: string
}

export const mockCollaborators: MockCollaborator[] = [
  {
    id: 'collab-1',
    inviter_id: 'user-1',
    invitee_email: 'collab@example.com',
    folder_id: '4', // research-notes (private)
    access_level: 'viewer',
    created_at: '2024-12-15T12:00:00Z',
  }
]

// ── Folders ──────────────────────────────────────────────────

export const mockFolders: Folder[] = [
  {
    id: 'general',
    owner_id: 'user-1',
    parent_id: null,
    title: 'general',
    description: 'Default folder for all notes and subfolders.',
    slug: 'general',
    visibility: 'public',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-10-01T00:00:00Z',
    note_count: 3,
    subfolders: [],
  },
  {
    id: '1',
    owner_id: 'user-1',
    parent_id: null,
    title: 'Full Stack Development',
    description: 'Everything you need to build modern web applications end to end.',
    slug: 'full-stack-development',
    visibility: 'public',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
    note_count: 12,
    subfolders: [
      {
        id: '1a',
        owner_id: 'user-1',
        parent_id: '1',
        title: 'Frontend',
        description: 'React, TypeScript, and UI patterns.',
        slug: 'frontend',
        visibility: 'public',
        created_at: '2024-11-01T10:00:00Z',
        updated_at: '2024-11-01T10:00:00Z',
        note_count: 6,
      },
      {
        id: '1b',
        owner_id: 'user-1',
        parent_id: '1',
        title: 'Backend',
        description: 'Node.js, APIs, and databases.',
        slug: 'backend',
        visibility: 'public',
        created_at: '2024-11-01T10:00:00Z',
        updated_at: '2024-11-01T10:00:00Z',
        note_count: 6,
      },
    ],
  },
  {
    id: '2',
    owner_id: 'user-1',
    parent_id: null,
    title: 'System Design',
    description: 'Architecture patterns, scalability, and distributed systems.',
    slug: 'system-design',
    visibility: 'public',
    created_at: '2024-11-10T08:00:00Z',
    updated_at: '2024-11-10T08:00:00Z',
    note_count: 8,
    subfolders: [
      {
        id: '2a',
        owner_id: 'user-1',
        parent_id: '2',
        title: 'Database Design',
        description: 'Schema design, indexing, and normalisation.',
        slug: 'database-design',
        visibility: 'public',
        created_at: '2024-11-10T08:00:00Z',
        updated_at: '2024-11-10T08:00:00Z',
        note_count: 4,
      },
    ],
  },
  {
    id: '3',
    owner_id: 'user-1',
    parent_id: null,
    title: 'DevOps & Deployment',
    description: 'CI/CD pipelines, Docker, and cloud infrastructure.',
    slug: 'devops-deployment',
    visibility: 'public',
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2024-12-01T09:00:00Z',
    note_count: 5,
    subfolders: [],
  },
  {
    id: '4',
    owner_id: 'user-1',
    parent_id: null,
    title: 'Research Notes',
    description: 'Private research and reading notes.',
    slug: 'research-notes',
    visibility: 'private',
    created_at: '2024-12-15T12:00:00Z',
    updated_at: '2024-12-15T12:00:00Z',
    note_count: 3,
    subfolders: [],
  },
]

// ── Notes ────────────────────────────────────────────────────

export const mockNotes: Note[] = [
  {
    id: 'n-gen1',
    folder_id: 'general',
    owner_id: 'user-1',
    title: 'Getting Started with Confluence',
    description: 'Welcome to your structured note sharing space.',
    slug: 'getting-started-with-confluence',
    visibility: 'public',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-10-01T00:00:00Z',
    folder: { id: 'general', title: 'general', slug: 'general' },
  },
  {
    id: 'n1',
    folder_id: '1a',
    owner_id: 'user-1',
    title: 'How to Set Up a React Project',
    description: 'Vite, TypeScript, and Tailwind from scratch.',
    slug: 'how-to-set-up-a-react-project',
    visibility: 'public',
    created_at: '2024-11-02T10:00:00Z',
    updated_at: '2024-11-02T10:00:00Z',
    folder: { id: '1a', title: 'Frontend', slug: 'frontend' },
  },
  {
    id: 'n2',
    folder_id: '1b',
    owner_id: 'user-1',
    title: 'JWT Authentication in Express',
    description: 'Signing, verifying, and refreshing tokens.',
    slug: 'jwt-authentication-express',
    visibility: 'public',
    created_at: '2024-11-05T10:00:00Z',
    updated_at: '2024-11-05T10:00:00Z',
    folder: { id: '1b', title: 'Backend', slug: 'backend' },
  },
  {
    id: 'n3',
    folder_id: '2',
    owner_id: 'user-1',
    title: 'CAP Theorem Explained',
    description: 'Consistency, availability, and partition tolerance.',
    slug: 'cap-theorem-explained',
    visibility: 'public',
    created_at: '2024-11-12T08:00:00Z',
    updated_at: '2024-11-12T08:00:00Z',
    folder: { id: '2', title: 'System Design', slug: 'system-design' },
  },
  {
    id: 'n4',
    folder_id: '1a',
    owner_id: 'user-1',
    title: 'React 19 — What Changed',
    description: 'use(), Actions, and the new compiler.',
    slug: 'react-19-what-changed',
    visibility: 'public',
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
    folder: { id: '1a', title: 'Frontend', slug: 'frontend' },
  },
  {
    id: 'n5',
    folder_id: '3',
    owner_id: 'user-1',
    title: 'Docker Compose for Local Dev',
    description: 'Multi-service setups made easy.',
    slug: 'docker-compose-local-dev',
    visibility: 'public',
    created_at: '2024-12-03T09:00:00Z',
    updated_at: '2024-12-03T09:00:00Z',
    folder: { id: '3', title: 'DevOps & Deployment', slug: 'devops-deployment' },
  },
  {
    id: 'n6',
    folder_id: '4',
    owner_id: 'user-1',
    title: 'Reading List — Q1 2025',
    description: 'Papers and books queued for reading.',
    slug: 'reading-list-q1-2025',
    visibility: 'private',
    created_at: '2024-12-15T12:00:00Z',
    updated_at: '2024-12-15T12:00:00Z',
    folder: { id: '4', title: 'Research Notes', slug: 'research-notes' },
  },
]

// ── Recursive Cascading Permission SOLVERS (Frontend Prototype) ──

export function hasFolderAccess(
  folderId: string,
  userId: string,
  userEmail: string,
  userType: string
): boolean {
  if (userType === 'admin') return true

  // Find the folder (could be root folder or subfolder)
  const folder = mockFolders.find(f => f.id === folderId)
  if (!folder) {
    // If not found in flat, check if it exists inside subfolders list recursively
    for (const r of mockFolders) {
      const sub = r.subfolders?.find(sf => sf.id === folderId)
      if (sub) return hasFolderAccess(r.id, userId, userEmail, userType) || sub.visibility === 'public' || sub.owner_id === userId
    }
    return false
  }

  // 1. Owner has access
  if (folder.owner_id === userId) return true

  // 2. Public has access
  if (folder.visibility === 'public') return true

  // 3. Check direct collaboration invitation by email
  const isInvited = mockCollaborators.some(
    c => c.folder_id === folderId && c.invitee_email.toLowerCase() === userEmail.toLowerCase()
  )
  if (isInvited) return true

  // 4. Recurse up to parent folder (cascading access!)
  if (folder.parent_id) {
    return hasFolderAccess(folder.parent_id, userId, userEmail, userType)
  }

  return false
}

export function hasNoteAccess(
  noteId: string,
  userId: string,
  userEmail: string,
  userType: string
): boolean {
  if (userType === 'admin') return true

  const note = mockNotes.find(n => n.id === noteId)
  if (!note) return false

  // 1. Owner has access
  if (note.owner_id === userId) return true

  // 2. Public has access
  if (note.visibility === 'public') return true

  // 3. Check direct note collaboration invitation by email
  const isInvited = mockCollaborators.some(
    c => c.note_id === noteId && c.invitee_email.toLowerCase() === userEmail.toLowerCase()
  )
  if (isInvited) return true

  // 4. Check folder containing the note (cascading access!)
  if (note.folder_id) {
    return hasFolderAccess(note.folder_id, userId, userEmail, userType)
  }

  return false
}
