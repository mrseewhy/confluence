import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthProvider'
import { RequireAuth } from '@/components/RequireAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
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
const DashboardOverview    = lazy(() => import('@/pages/dashboard/Overview').then(m => ({ default: m.DashboardOverview })))
const DashboardFolders     = lazy(() => import('@/pages/dashboard/Folders').then(m => ({ default: m.DashboardFolders })))
const DashboardSubfolders  = lazy(() => import('@/pages/dashboard/Subfolders').then(m => ({ default: m.DashboardSubfolders })))
const DashboardNotes       = lazy(() => import('@/pages/dashboard/Notes').then(m => ({ default: m.DashboardNotes })))
const DashboardSettings    = lazy(() => import('@/pages/dashboard/Settings').then(m => ({ default: m.DashboardSettings })))
const CreateNote           = lazy(() => import('@/pages/dashboard/CreateNote').then(m => ({ default: m.CreateNote })))
const EditNote             = lazy(() => import('@/pages/dashboard/EditNote').then(m => ({ default: m.EditNote })))
const AdminOverview        = lazy(() => import('@/pages/admin/Overview').then(m => ({ default: m.AdminOverview })))
const AdminUsers           = lazy(() => import('@/pages/admin/Users').then(m => ({ default: m.AdminUsers })))
const AdminFolders         = lazy(() => import('@/pages/admin/Folders').then(m => ({ default: m.AdminFolders })))
const AdminNotes           = lazy(() => import('@/pages/admin/Notes').then(m => ({ default: m.AdminNotes })))

function PageSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>          <AuthProvider>
          <ToastProvider>
          <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
          <Routes>

          {/* ── Public ── */}
          <Route path="/"        element={<HomePage />} />
          <Route path="/folders" element={<FoldersPage />} />
          <Route path="/notes"   element={<NotesPage />} />
          <Route path="/:username/n/:slug" element={<NoteDetailPage />} />
          <Route path="/:username/folder/:slug" element={<FolderDetailPage />} />
          <Route path="/:username" element={<UserProfilePage />} />
          <Route path="/signup"  element={<SignUpPage />} />
          <Route path="/login"   element={<SignInPage />} />
          <Route path="/recover" element={<PasswordRecoveryPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/redirect" element={<AuthRedirectPage />} />

          {/* ── User dashboard ── */}
          <Route path="/dashboard"            element={<RequireAuth userType="user"><DashboardOverview /></RequireAuth>} />
          <Route path="/dashboard/folders"    element={<RequireAuth userType="user"><DashboardFolders /></RequireAuth>} />
          <Route path="/dashboard/subfolders" element={<RequireAuth userType="user"><DashboardSubfolders /></RequireAuth>} />
          <Route path="/dashboard/notes"          element={<RequireAuth userType="user"><DashboardNotes /></RequireAuth>} />
          <Route path="/dashboard/notes/new"      element={<RequireAuth userType="user"><CreateNote /></RequireAuth>} />
          <Route path="/dashboard/notes/:slug/edit" element={<RequireAuth userType="user"><EditNote /></RequireAuth>} />
          <Route path="/dashboard/settings"       element={<RequireAuth userType="user"><DashboardSettings /></RequireAuth>} />

          {/* ── Admin dashboard ── */}
          <Route path="/admin/dashboard"         element={<RequireAuth userType="admin"><AdminOverview /></RequireAuth>} />
          <Route path="/admin/dashboard/users"   element={<RequireAuth userType="admin"><AdminUsers /></RequireAuth>} />
          <Route path="/admin/dashboard/folders" element={<RequireAuth userType="admin"><AdminFolders /></RequireAuth>} />
          <Route path="/admin/dashboard/notes"   element={<RequireAuth userType="admin"><AdminNotes /></RequireAuth>} />

          </Routes>
          </Suspense>
          </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
