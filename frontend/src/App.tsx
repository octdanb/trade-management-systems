import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/app-layout'
import { useHealth } from '@/gen'
import { useSession } from '@/hooks/use-auth'
import { ClientDetailPage } from '@/pages/client-detail'
import { ClientsPage } from '@/pages/clients'
import { EquipmentDetailPage } from '@/pages/equipment-detail'
import { EquipmentPage } from '@/pages/equipment'
import { LoginPage } from '@/pages/login'
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/reset-password'
import { SchedulePage } from '@/pages/schedule'
import { SettingsPage } from '@/pages/settings'
import { SignupPage } from '@/pages/signup'
import { TodayPage } from '@/pages/today'
import { VerifyEmailPage } from '@/pages/verify-email'

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
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
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
      {/* Email-link landing pages work whether or not you're signed in. */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:key" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:key" element={<VerifyEmailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
