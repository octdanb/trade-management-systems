import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLogout, useSession } from '../src/hooks/use-auth'
import { api } from '../src/lib/api'

type Job = {
  id: number
  client_name: string
  scheduled_time: string | null
  status: string
  price: string
  paid: boolean
}

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export default function HomeScreen() {
  const router = useRouter()
  const session = useSession()
  const logout = useLogout()

  const today = todayString()
  const jobs = useQuery({
    queryKey: ['jobs', today],
    queryFn: async () =>
      (await api.get<Job[]>('/api/jobs', { params: { start: today, end: today } })).data,
    enabled: !!session.data,
  })

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-5 py-3">
        <View>
          <Text className="text-lg font-bold text-foreground">Today</Text>
          <Text className="text-xs text-muted-foreground">{session.data?.email}</Text>
        </View>
        <Pressable
          className="rounded-lg border border-border px-3 py-1.5 active:opacity-70"
          onPress={() => logout.mutate(undefined, { onSuccess: () => router.replace('/login') })}
        >
          <Text className="text-sm text-foreground">Sign out</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        {jobs.isLoading ? (
          <Text className="text-muted-foreground">Loading…</Text>
        ) : jobs.data?.length ? (
          jobs.data.map((job) => (
            <View
              key={job.id}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-border p-4"
            >
              <View className="flex-1">
                <Text className="font-medium text-foreground">{job.client_name}</Text>
                <Text className="text-xs text-muted-foreground">
                  {job.scheduled_time ? job.scheduled_time.slice(0, 5) : 'Any time'} · {job.status}
                </Text>
              </View>
              <Text className="font-semibold text-foreground">${job.price}</Text>
            </View>
          ))
        ) : (
          <Text className="text-muted-foreground">Nothing scheduled today.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
