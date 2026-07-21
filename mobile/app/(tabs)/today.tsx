import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, EmptyState, LoadingState } from '../../src/components/ui'
import {
  jobStatusEnum,
  type RouteStopOut,
  useGetRoutePlan,
  useListNotifications,
  useOptimizeRoute,
  useReorderRoute,
  useUpdateJob,
} from '../../src/gen'
import { addDays, formatDuration, formatTime, humanDate, todayString } from '../../src/lib/format'
import { googleMapsDirectionsUrl } from '../../src/lib/maps'
import { JOBS_BASE_KEY, ROUTE_BASE_KEY } from '../../src/lib/query-keys'

export default function TodayScreen() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayString())

  const plan = useGetRoutePlan({ date })
  const notifications = useListNotifications({ unread: true, limit: 20 })
  const unreadCount = notifications.data?.length ?? 0

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ROUTE_BASE_KEY })
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
  }

  const optimize = useOptimizeRoute({ mutation: { onSuccess: invalidate } })
  const reorder = useReorderRoute({ mutation: { onSuccess: invalidate } })
  const updateJob = useUpdateJob({ mutation: { onSuccess: invalidate } })

  const stops = plan.data?.stops ?? []
  const unrouted = plan.data?.unrouted ?? []
  const allJobs = [...stops, ...unrouted]
  const mapsUrl = plan.data ? googleMapsDirectionsUrl(plan.data.home ?? null, stops) : null

  const doneCount = allJobs.filter((j) => j.status === jobStatusEnum.completed).length
  const revenue = allJobs
    .filter((j) => j.status === jobStatusEnum.completed)
    .reduce((sum, j) => sum + Number(j.price), 0)

  function move(index: number, delta: number) {
    const ids = stops.map((s) => s.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate({ data: { date, job_ids: ids } })
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header: date nav + notifications bell */}
      <View className="flex-row items-center gap-2 border-b border-border px-4 py-2">
        <Pressable className="p-2" onPress={() => setDate(addDays(date, -1))}>
          <Ionicons name="chevron-back" size={20} />
        </Pressable>
        <Pressable className="flex-1 items-center" onPress={() => setDate(todayString())}>
          <Text className="text-base font-bold text-foreground">
            {date === todayString() ? 'Today' : humanDate(date)}
          </Text>
          {date !== todayString() && (
            <Text className="text-[10px] text-muted-foreground">tap for today</Text>
          )}
        </Pressable>
        <Pressable className="p-2" onPress={() => setDate(addDays(date, 1))}>
          <Ionicons name="chevron-forward" size={20} />
        </Pressable>
        <Link href="/notifications" asChild>
          <Pressable className="relative p-2">
            <Ionicons name="notifications-outline" size={22} />
            {unreadCount > 0 && (
              <View className="absolute right-0 top-0 h-4 w-4 items-center justify-center rounded-full bg-red-600">
                <Text className="text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </Link>
      </View>

      <ScrollView className="flex-1 px-4 py-3" contentContainerClassName="pb-8">
        {/* Actions + totals */}
        <View className="mb-3 flex-row gap-2">
          <Button
            title={optimize.isPending ? 'Optimizing…' : 'Optimize route'}
            className="flex-1"
            loading={optimize.isPending}
            disabled={stops.length < 2}
            onPress={() => optimize.mutate({ data: { date } })}
          />
          {mapsUrl && (
            <Button title="Maps" variant="outline" onPress={() => Linking.openURL(mapsUrl)} />
          )}
        </View>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">
            {doneCount}/{allJobs.length} done · ${revenue.toFixed(2)} earned
          </Text>
          {plan.data?.total_duration_s != null && (
            <Text className="text-sm text-muted-foreground">
              {formatDuration(plan.data.total_duration_s)} driving
            </Text>
          )}
        </View>
        {plan.data?.used_fallback_matrix && (
          <Text className="mb-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            Routing service unreachable — order based on straight-line distance.
          </Text>
        )}

        {plan.isLoading ? (
          <LoadingState />
        ) : allJobs.length === 0 ? (
          <EmptyState text="Nothing scheduled for this day." />
        ) : (
          <View className="gap-2">
            {stops.map((stop, index) => (
              <StopCard
                key={stop.id}
                stop={stop}
                position={index + 1}
                canMoveUp={index > 0}
                canMoveDown={index < stops.length - 1}
                onMove={(delta) => move(index, delta)}
                onSetStatus={(status) => updateJob.mutate({ job_id: stop.id, data: { status } })}
                onTogglePaid={() =>
                  updateJob.mutate({ job_id: stop.id, data: { paid: !stop.paid } })
                }
              />
            ))}
            {unrouted.length > 0 && (
              <>
                <Text className="mt-2 text-xs text-muted-foreground">
                  No location — fix the client's address to route these:
                </Text>
                {unrouted.map((stop) => (
                  <StopCard
                    key={stop.id}
                    stop={stop}
                    onSetStatus={(status) =>
                      updateJob.mutate({ job_id: stop.id, data: { status } })
                    }
                    onTogglePaid={() =>
                      updateJob.mutate({ job_id: stop.id, data: { paid: !stop.paid } })
                    }
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StopCard({
  stop,
  position,
  canMoveUp,
  canMoveDown,
  onMove,
  onSetStatus,
  onTogglePaid,
}: {
  stop: RouteStopOut
  position?: number
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMove?: (delta: number) => void
  onSetStatus: (status: 'scheduled' | 'completed' | 'skipped') => void
  onTogglePaid: () => void
}) {
  const done = stop.status === jobStatusEnum.completed
  const skipped = stop.status === jobStatusEnum.skipped

  return (
    <Card className={done || skipped ? 'opacity-60' : ''}>
      <View className="flex-row items-center gap-3">
        {position != null && (
          <View className="h-7 w-7 items-center justify-center rounded-full bg-muted">
            <Text className="text-sm font-bold text-foreground">{position}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className={`font-medium text-foreground ${done ? 'line-through' : ''}`}>
            {stop.client_name}
            {stop.scheduled_time ? ` · ${formatTime(stop.scheduled_time)}` : ''}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {stop.address || 'No address'}
            {stop.leg_duration_s != null && ` · ${formatDuration(stop.leg_duration_s)} drive`}
          </Text>
        </View>
        {stop.kind === 'quote' ? (
          <Badge text="Quote" tone="amber" />
        ) : (
          <Text className="font-semibold text-foreground">${stop.price}</Text>
        )}
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        {stop.kind !== 'quote' && (
          <Pressable onPress={onTogglePaid}>
            <Badge text={stop.paid ? 'Paid' : 'Unpaid'} tone={stop.paid ? 'green' : 'neutral'} />
          </Pressable>
        )}
        {skipped && <Badge text="Skipped" tone="amber" />}
        <View className="flex-1" />
        {onMove && (
          <>
            <Pressable
              className={`p-1.5 ${canMoveUp ? '' : 'opacity-30'}`}
              disabled={!canMoveUp}
              onPress={() => onMove(-1)}
            >
              <Ionicons name="arrow-up" size={16} />
            </Pressable>
            <Pressable
              className={`p-1.5 ${canMoveDown ? '' : 'opacity-30'}`}
              disabled={!canMoveDown}
              onPress={() => onMove(1)}
            >
              <Ionicons name="arrow-down" size={16} />
            </Pressable>
          </>
        )}
        {!done && (
          <Pressable
            className="rounded-lg px-2 py-1"
            onPress={() => onSetStatus(skipped ? 'scheduled' : 'skipped')}
          >
            <Text className="text-xs text-muted-foreground">{skipped ? 'Unskip' : 'Skip'}</Text>
          </Pressable>
        )}
        {!skipped && (
          <Pressable
            className={`rounded-lg px-3 py-1.5 ${done ? 'bg-muted' : 'bg-primary'}`}
            onPress={() => onSetStatus(done ? 'scheduled' : 'completed')}
          >
            <Text
              className={`text-xs font-semibold ${done ? 'text-foreground' : 'text-primary-foreground'}`}
            >
              {done ? 'Undo' : 'Done'}
            </Text>
          </Pressable>
        )}
      </View>
    </Card>
  )
}
