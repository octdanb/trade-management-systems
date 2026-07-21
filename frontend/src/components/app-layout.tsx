import { NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useLogout, useSession } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/today', label: 'Today' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/clients', label: 'Clients' },
  { to: '/settings', label: 'Settings' },
]

export function AppLayout() {
  const session = useSession()
  const logoutMutation = useLogout()

  return (
    <div className="flex min-h-svh flex-col">
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
