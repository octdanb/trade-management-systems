import { useQueryClient } from '@tanstack/react-query'
import { Bell, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRunReminders,
} from '@/gen'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const NOTIFICATIONS_BASE_KEY = [{ url: '/api/notifications' }] as const

export function NotificationsBell() {
  const queryClient = useQueryClient()
  const notifications = useListNotifications({ limit: 20 })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_BASE_KEY })

  const markRead = useMarkNotificationRead({ mutation: { onSuccess: invalidate } })
  const markAllRead = useMarkAllNotificationsRead({ mutation: { onSuccess: invalidate } })
  const runReminders = useRunReminders({ mutation: { onSuccess: invalidate } })

  const items = notifications.data ?? []
  const unreadCount = items.filter((n) => !n.read_at).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={runReminders.isPending}
              onClick={() => runReminders.mutate(undefined)}
              title="Check service reminders now (normally runs daily)"
            >
              <RefreshCw className={cn('size-3', runReminders.isPending && 'animate-spin')} />
              Check now
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate(undefined)}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length ? (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent/50',
                  !n.read_at && 'bg-accent/30',
                )}
                onClick={() => !n.read_at && markRead.mutate({ notification_id: n.id })}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.read_at && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  {n.title}
                </span>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing yet. Service reminders will show up here (and as push notifications in the
              mobile app).
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
