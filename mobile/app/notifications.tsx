import { useQueryClient } from '@tanstack/react-query'
import { FlatList, Pressable, Text, View } from 'react-native'

import { Button, EmptyState, LoadingState } from '../src/components/ui'
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRunReminders,
} from '../src/gen'
import { NOTIFICATIONS_BASE_KEY } from '../src/lib/query-keys'

export default function NotificationsScreen() {
  const queryClient = useQueryClient()
  const notifications = useListNotifications({ limit: 50 })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_BASE_KEY })
  const markRead = useMarkNotificationRead({ mutation: { onSuccess: invalidate } })
  const markAllRead = useMarkAllNotificationsRead({ mutation: { onSuccess: invalidate } })
  const runReminders = useRunReminders({ mutation: { onSuccess: invalidate } })

  const items = notifications.data ?? []
  const unread = items.filter((n) => !n.read_at).length

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-2 border-b border-border px-4 py-2">
        <Button
          title={runReminders.isPending ? 'Checking…' : 'Check reminders now'}
          variant="outline"
          className="flex-1 px-3 py-2"
          loading={runReminders.isPending}
          onPress={() => runReminders.mutate(undefined)}
        />
        {unread > 0 && (
          <Button
            title="Mark all read"
            variant="ghost"
            className="px-3 py-2"
            onPress={() => markAllRead.mutate(undefined)}
          />
        )}
      </View>
      {notifications.isLoading ? (
        <LoadingState />
      ) : items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="pb-8"
          renderItem={({ item }) => (
            <Pressable
              className={`border-b border-border px-4 py-3 ${item.read_at ? '' : 'bg-muted/60'}`}
              onPress={() => !item.read_at && markRead.mutate({ notification_id: item.id })}
            >
              <Text className="font-medium text-foreground">
                {!item.read_at && <Text className="text-emerald-600">● </Text>}
                {item.title}
              </Text>
              {item.body ? (
                <Text className="text-sm text-muted-foreground">{item.body}</Text>
              ) : null}
              <Text className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <View className="p-4">
          <EmptyState text="Nothing yet. Service reminders show up here — and as push notifications once the store apps ship." />
        </View>
      )}
    </View>
  )
}
