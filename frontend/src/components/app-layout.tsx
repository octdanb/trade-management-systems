import { useMutation } from '@tanstack/react-query'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { NotificationsBell } from '@/components/notifications-bell'
import { Button } from '@/components/ui/button'
import { useEmailAddresses, useLogout, useSession } from '@/hooks/use-auth'
import { resendVerification } from '@/lib/allauth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/today', label: 'Today' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/clients', label: 'Clients' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/settings', label: 'Settings' },
]

function VerifyEmailBanner() {
  const emails = useEmailAddresses()
  const resend = useMutation({ mutationFn: resendVerification })

  const primary = emails.data?.find((e) => e.primary) ?? emails.data?.[0]
  if (!primary || primary.verified) return null

  return (
    <div className="border-b bg-secondary px-4 py-2 text-center text-sm">
      Please verify your email address ({primary.email}).{' '}
      {resend.isSuccess ? (
        <span className="text-muted-foreground">Verification email sent.</span>
      ) : (
        <button
          type="button"
          className="font-medium underline underline-offset-4"
          disabled={resend.isPending}
          onClick={() => resend.mutate(primary.email)}
        >
          Resend email
        </button>
      )}{' '}
      <Link to="/settings" className="text-muted-foreground underline underline-offset-4">
        Manage
      </Link>
    </div>
  )
}

export function AppLayout() {
  const session = useSession()
  const logoutMutation = useLogout()

  return (
    <div className="flex min-h-svh flex-col">
      <VerifyEmailBanner />
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-1 px-4">
          <span className="mr-4 font-semibold">🌱 Mow</span>
          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">
            {session.data?.email}
          </span>
          <NotificationsBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
