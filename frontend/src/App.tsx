import { Navigate, Route, Routes } from 'react-router-dom'

import { useHealth } from '@/gen'
import { useSession } from '@/hooks/use-auth'
import { DashboardPage } from '@/pages/dashboard'
import { LoginPage } from '@/pages/login'
import { SignupPage } from '@/pages/signup'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useSession()

  if (session.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }
  if (!session.data) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const session = useSession()

  if (session.data) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  // Public endpoint; also primes the CSRF cookie before any login/signup POST.
  useHealth()

  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignupPage />
          </RedirectIfAuthed>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
