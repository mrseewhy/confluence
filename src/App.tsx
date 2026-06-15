import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthProvider'
import { RequireAuth } from '@/components/RequireAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { ToastProvider } from '@/components/Toast'

// ── Critical routes (eager — always in the main chunk) ───────
import { HomePage } from '@/pages/HomePage'
import { SignInPage } from '@/pages/SignInPage'
import { SignUpPage } from '@/pages/SignUpPage'

// ── Lazy-loaded pages ─────────────────────────────────────────
const FoldersPage          = lazy(() => import('@/pages/FoldersPage').then(m => ({ default: m.FoldersPage })))
const NotesPage            = lazy(() => import('@/pages/NotesPage').then(m => ({ default: m.NotesPage })))
const PasswordRecoveryPage = lazy(() => import('@/pages/PasswordRecoveryPage').then(m => ({ default: m.PasswordRecoveryPage })))
const ResetPasswordPage    = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const AuthRedirectPage     = lazy(() => import('@/pages/AuthRedirectPage').then(m => ({ default: m.AuthRedirectPage })))
const NoteDetailPage       = lazy(() => import('@/pages/NoteDetailPage').then(m => ({ default: m.NoteDetailPage })))
const FolderDetailPage     = lazy(() => import('@/pages/FolderDetailPage').then(m => ({ default: m.FolderDetailPage })))
const UserProfilePage      = lazy(() => import('@/pages/UserProfilePage').then(m => ({ default: m.UserProfilePage })))
const TermsPage            = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })))
const PrivacyPage          = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const DashboardOverview    = lazy(() => import('@/pages/dashboard/Overview').then(m => ({ default: m.DashboardOverview })))
const DashboardFolders     = lazy(() => import('@/pages/dashboard/Folders').then(m => ({ default: m.DashboardFolders })))
const DashboardSubfolders  = lazy(() => import('@/pages/dashboard/Subfolders').then(m => ({ default: m.DashboardSubfolders })))
const DashboardNotes       = lazy(() => import('@/pages/dashboard/Notes').then(m => ({ default: m.DashboardNotes })))
const DashboardSettings    = lazy(() => import('@/pages/dashboard/Settings').then(m => ({ default: m.DashboardSettings })))
const DashboardCollaborators = lazy(() => import('@/pages/dashboard/Collaborators').then(m => ({ default: m.DashboardCollaborators })))
const DashboardActivityLog  = lazy(() => import('@/pages/dashboard/ActivityLog').then(m => ({ default: m.DashboardActivityLog })))
const DashboardCollaborations = lazy(() => import('@/pages/dashboard/Collaborations').then(m => ({ default: m.DashboardCollaborations })))
const DashboardTrash         = lazy(() => import('@/pages/dashboard/Trash').then(m => ({ default: m.DashboardTrash })))
const CreateNote           = lazy(() => import('@/pages/dashboard/CreateNote').then(m => ({ default: m.CreateNote })))
const EditNote             = lazy(() => import('@/pages/dashboard/EditNote').then(m => ({ default: m.EditNote })))
const AdminOverview        = lazy(() => import('@/pages/admin/Overview').then(m => ({ default: m.AdminOverview })))
const AdminUsers           = lazy(() => import('@/pages/admin/Users').then(m => ({ default: m.AdminUsers })))
const AdminFolders         = lazy(() => import('@/pages/admin/Folders').then(m => ({ default: m.AdminFolders })))
const AdminNotes           = lazy(() => import('@/pages/admin/Notes').then(m => ({ default: m.AdminNotes })))
const AdminSubfolders      = lazy(() => import('@/pages/admin/Subfolders').then(m => ({ default: m.AdminSubfolders })))
const AdminActivityLog     = lazy(() => import('@/pages/admin/ActivityLog').then(m => ({ default: m.AdminActivityLog })))



export function EnvCheck() {
  const missing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (missing) {
    console.error(
      '%c[confluence] Missing Supabase environment variables.\n' +
      '%cSet VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
      '%cThe app will render but all Supabase features (auth, DB, storage) will be unavailable.',
      'font-weight: bold; color: #e74c3c; font-size: 13px;',
      'color: #e67e22; font-size: 12px;',
      'color: #95a5a6; font-size: 12px;',
    )
    return (
      <div style={{
        background: '#e74c3c',
        color: '#fff',
        textAlign: 'center',
        padding: '12px 16px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
      }}>
        ⚠️ Configuration Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local
      </div>
    )
  }
  return null
}

export default function App() {
  return (
    <HelmetProvider>
    <ThemeProvider>
      <EnvCheck />
      <BrowserRouter>          <AuthProvider>
          <ToastProvider>
          {/* Top-level ErrorBoundary catches crashes in ANY route, while per-route boundaries isolate individual lazy pages */}
          <ErrorBoundary>
          <Routes>

          {/* ── Public ── */}
          <Route path="/"        element={<RouteErrorBoundary><HomePage /></RouteErrorBoundary>} />
          <Route path="/folders" element={<RouteErrorBoundary><FoldersPage /></RouteErrorBoundary>} />
          <Route path="/notes"   element={<RouteErrorBoundary><NotesPage /></RouteErrorBoundary>} />
          <Route path="/:username/n/:slug" element={<RouteErrorBoundary><NoteDetailPage /></RouteErrorBoundary>} />
          <Route path="/:username/folder/:slug" element={<RouteErrorBoundary><FolderDetailPage /></RouteErrorBoundary>} />
          <Route path="/:username" element={<RouteErrorBoundary><UserProfilePage /></RouteErrorBoundary>} />
          <Route path="/signup"  element={<RouteErrorBoundary><SignUpPage /></RouteErrorBoundary>} />
          <Route path="/login"   element={<RouteErrorBoundary><SignInPage /></RouteErrorBoundary>} />
          <Route path="/recover" element={<RouteErrorBoundary><PasswordRecoveryPage /></RouteErrorBoundary>} />
          <Route path="/reset-password" element={<RouteErrorBoundary><ResetPasswordPage /></RouteErrorBoundary>} />
          <Route path="/auth/redirect" element={<RouteErrorBoundary><AuthRedirectPage /></RouteErrorBoundary>} />
          <Route path="/terms"   element={<RouteErrorBoundary><TermsPage /></RouteErrorBoundary>} />
          <Route path="/privacy" element={<RouteErrorBoundary><PrivacyPage /></RouteErrorBoundary>} />

          {/* ── User dashboard ── */}
          <Route path="/dashboard"            element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardOverview /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/folders"    element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardFolders /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/subfolders" element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardSubfolders /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/notes"          element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardNotes /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/notes/new"      element={<RequireAuth userType="user"><RouteErrorBoundary><CreateNote /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/notes/:slug/edit" element={<RequireAuth userType="user"><RouteErrorBoundary><EditNote /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/collaborators"  element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardCollaborators /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/activity"        element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardActivityLog /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/collaborations"  element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardCollaborations /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/trash"            element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardTrash /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/dashboard/settings"       element={<RequireAuth userType="user"><RouteErrorBoundary><DashboardSettings /></RouteErrorBoundary></RequireAuth>} />

          {/* ── Admin dashboard ── */}
          <Route path="/admin/dashboard"         element={<RequireAuth userType="admin"><RouteErrorBoundary><AdminOverview /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/admin/dashboard/users"   element={<RequireAuth userType="admin"><RouteErrorBoundary><AdminUsers /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/admin/dashboard/folders" element={<RequireAuth userType="admin"><RouteErrorBoundary><AdminFolders /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/admin/dashboard/notes"   element={<RequireAuth userType="admin"><RouteErrorBoundary><AdminNotes /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/admin/dashboard/subfolders" element={<RequireAuth userType="admin"><RouteErrorBoundary><AdminSubfolders /></RouteErrorBoundary></RequireAuth>} />
          <Route path="/admin/dashboard/activity"   element={<RequireAuth userType="admin"><RouteErrorBoundary><AdminActivityLog /></RouteErrorBoundary></RequireAuth>} />

          </Routes>
          </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
    </HelmetProvider>
  )
}
