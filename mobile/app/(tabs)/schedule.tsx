import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, SectionList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, EmptyState, LoadingState } from '../../src/components/ui'
import { type JobOut, jobStatusEnum, useListJobs } from '../../src/gen'
import { addDays, formatTime, humanDate, todayString } from '../../src/lib/format'

const PAST_DAYS = 7
const FUTURE_DAYS = 42

export default function ScheduleScreen() {
  const router = useRouter()
  const today = todayString()
  const start = addDays(today, -PAST_DAYS)
  const end = addDays(today, FUTURE_DAYS)

  const jobs = useListJobs({ start, end })

  const sections = useMemo(() => {
    const byDate = new Map<string, JobOut[]>()
    for (const job of jobs.data ?? []) {
      if (job.status === jobStatusEnum.cancelled) continue
      const list = byDate.get(job.scheduled_date) ?? []
      list.push(job)
      byDate.set(job.scheduled_date, list)
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ title: date, data }))
  }, [jobs.data])

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-2.5">
        <Text className="text-base font-bold text-foreground">Schedule</Text>
        <Link href={{ pathname: '/new-appointment', params: { date: today } }} asChild>
          <Pressable className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-1.5">
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-sm font-semibold text-primary-foreground">Add</Text>
          </Pressable>
        </Link>
      </View>

      {jobs.isLoading ? (
        <LoadingState />
      ) : sections.length === 0 ? (
        <View className="p-4">
          <EmptyState text="No appointments in the next 6 weeks. Tap Add to create one." />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled
          contentContainerClassName="pb-8"
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center justify-between bg-muted px-4 py-1.5">
              <Text
                className={`text-xs font-semibold ${section.title === today ? 'text-emerald-600' : 'text-muted-foreground'}`}
              >
                {section.title === today ? 'TODAY' : humanDate(section.title).toUpperCase()}
              </Text>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/new-appointment', params: { date: section.title } })
                }
              >
                <Ionicons name="add-circle-outline" size={18} color="#737373" />
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center gap-3 border-b border-border px-4 py-3 active:bg-muted"
              onPress={() =>
                router.push({
                  pathname: '/job/[id]',
                  params: { id: String(item.id), date: item.scheduled_date },
                })
              }
            >
              <View className="flex-1">
                <Text
                  className={`font-medium text-foreground ${item.status === jobStatusEnum.completed ? 'line-through opacity-60' : ''}`}
                >
                  {item.client_name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {item.scheduled_time ? formatTime(item.scheduled_time) : 'Any time'}
                  {item.series_id ? ' · repeating' : ''}
                </Text>
              </View>
              {item.kind === 'quote' && <Badge text="Quote" tone="amber" />}
              {item.status === jobStatusEnum.completed && <Badge text="Done" tone="green" />}
              {item.status === jobStatusEnum.skipped && <Badge text="Skipped" tone="amber" />}
              {item.kind !== 'quote' && item.paid && <Badge text="Paid" tone="green" />}
              {item.kind !== 'quote' && (
                <Text className="font-semibold text-foreground">${item.price}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}
