import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthProvider'
import { RequireAuth } from '@/components/RequireAuth'

// ── Public pages ──────────────────────────────────────────────
import { HomePage }             from '@/pages/HomePage'
import { FoldersPage}          from '@/pages/FoldersPage'
import { NotesPage}            from '@/pages/NotesPage'
import { SignUpPage }           from '@/pages/SignUpPage'
import { SignInPage }           from '@/pages/SignInPage'
import { PasswordRecoveryPage } from '@/pages/PasswordRecoveryPage'
import { ResetPasswordPage }    from '@/pages/ResetPasswordPage'
import { AuthRedirectPage }     from '@/pages/AuthRedirectPage'
import { NoteDetailPage }       from '@/pages/NoteDetailPage'
import { FolderDetailPage }     from '@/pages/FolderDetailPage'

// ── User dashboard (/dashboard) ───────────────────────────────
import { DashboardOverview }    from '@/pages/dashboard/Overview'
import { DashboardFolders }     from '@/pages/dashboard/Folders'
import { DashboardSubfolders }  from '@/pages/dashboard/Subfolders'
import { DashboardNotes }       from '@/pages/dashboard/Notes'
import { DashboardSettings }    from '@/pages/dashboard/Settings'
import { CreateNote }           from '@/pages/dashboard/CreateNote'

// ── Admin dashboard (/admin/dashboard) ────────────────────────
import { AdminOverview }        from '@/pages/admin/Overview'
import { AdminUsers }           from '@/pages/admin/Users'
import { AdminFolders }         from '@/pages/admin/Folders'
import { AdminNotes }           from '@/pages/admin/Notes'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>

          {/* ── Public ── */}
          <Route path="/"        element={<HomePage />} />
          <Route path="/folders" element={<FoldersPage />} />
          <Route path="/notes"   element={<NotesPage />} />
          <Route path="/n/:slug" element={<NoteDetailPage />} />
          <Route path="/folder/:slug" element={<FolderDetailPage />} />
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
          <Route path="/dashboard/settings"       element={<RequireAuth userType="user"><DashboardSettings /></RequireAuth>} />

          {/* ── Admin dashboard ── */}
          <Route path="/admin/dashboard"         element={<RequireAuth userType="admin"><AdminOverview /></RequireAuth>} />
          <Route path="/admin/dashboard/users"   element={<RequireAuth userType="admin"><AdminUsers /></RequireAuth>} />
          <Route path="/admin/dashboard/folders" element={<RequireAuth userType="admin"><AdminFolders /></RequireAuth>} />
          <Route path="/admin/dashboard/notes"   element={<RequireAuth userType="admin"><AdminNotes /></RequireAuth>} />

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
