import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { FlatList, Image, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, EmptyState, LoadingState } from '../../src/components/ui'
import { useListEquipment } from '../../src/gen'
import { API_URL } from '../../src/lib/api'
import { todayString } from '../../src/lib/format'

export function absoluteMediaUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('file:') || url.startsWith('content:')) {
    return url
  }
  return `${API_URL}${url}`
}

export function serviceDueTone(dueOn: string | null | undefined) {
  if (!dueOn) return null
  const today = todayString()
  if (dueOn < today) return { text: 'Service overdue', tone: 'red' as const }
  const days = Math.round(
    (new Date(`${dueOn}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) /
      86_400_000,
  )
  if (days <= 7)
    return {
      text: days === 0 ? 'Service due today' : `Service in ${days}d`,
      tone: 'amber' as const,
    }
  return { text: `Service due ${dueOn}`, tone: 'neutral' as const }
}

export default function EquipmentScreen() {
  const router = useRouter()
  const equipment = useListEquipment()

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-2.5">
        <Text className="text-base font-bold text-foreground">Tools & equipment</Text>
        <Link href="/new-equipment" asChild>
          <Pressable className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-1.5">
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-sm font-semibold text-primary-foreground">Add</Text>
          </Pressable>
        </Link>
      </View>

      {equipment.isLoading ? (
        <LoadingState />
      ) : equipment.data?.length ? (
        <FlatList
          data={equipment.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="p-4 pb-8 gap-3"
          renderItem={({ item }) => {
            const due = item.status === 'active' ? serviceDueTone(item.next_service_due) : null
            return (
              <Pressable
                className="flex-row items-center gap-3 rounded-2xl border border-border p-3 active:bg-muted"
                onPress={() =>
                  router.push({ pathname: '/equipment/[id]', params: { id: String(item.id) } })
                }
              >
                {item.photos[0] ? (
                  <Image
                    source={{ uri: absoluteMediaUrl(item.photos[0].url) }}
                    className="h-16 w-16 rounded-xl"
                  />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-xl bg-muted">
                    <Ionicons name="construct-outline" size={22} color="#737373" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-medium text-foreground">{item.name}</Text>
                  {item.make_model ? (
                    <Text className="text-xs text-muted-foreground">{item.make_model}</Text>
                  ) : null}
                  <View className="mt-1 flex-row gap-2">
                    {item.status === 'retired' && <Badge text="Retired" />}
                    {due && <Badge text={due.text} tone={due.tone} />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
              </Pressable>
            )
          }}
        />
      ) : (
        <View className="p-4">
          <EmptyState text="No equipment yet. Add the mower, trimmer, trailer — anything you want to track servicing and photos for." />
        </View>
      )}
    </SafeAreaView>
  )
}
