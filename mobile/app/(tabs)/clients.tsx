import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, EmptyState, LoadingState } from '../../src/components/ui'
import { useListClients } from '../../src/gen'

export default function ClientsScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const clients = useListClients({ search: search || undefined })

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-2 border-b border-border px-4 py-2.5">
        <Text className="text-base font-bold text-foreground">Clients</Text>
        <TextInput
          className="ml-2 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
          placeholder="Search…"
          placeholderTextColor="#a3a3a3"
          value={search}
          onChangeText={setSearch}
        />
        <Link href="/new-client" asChild>
          <Pressable className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-1.5">
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-sm font-semibold text-primary-foreground">New</Text>
          </Pressable>
        </Link>
      </View>

      {clients.isLoading ? (
        <LoadingState />
      ) : clients.data?.length ? (
        <FlatList
          data={clients.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="pb-8"
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center gap-3 border-b border-border px-4 py-3 active:bg-muted"
              onPress={() =>
                router.push({ pathname: '/client/[id]', params: { id: String(item.id) } })
              }
            >
              <View className="flex-1">
                <Text className="font-medium text-foreground">{item.name}</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {item.address || item.phone || '—'}
                </Text>
              </View>
              {!item.is_active && <Badge text="Inactive" />}
              {item.address && item.geocode_status === 'failed' && (
                <Ionicons name="location-outline" size={16} color="#dc2626" />
              )}
              <Text className="font-semibold text-foreground">${item.rate}</Text>
              <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
            </Pressable>
          )}
        />
      ) : (
        <View className="p-4">
          <EmptyState
            text={search ? 'No clients match your search.' : 'No clients yet — add your first one.'}
          />
        </View>
      )}
    </SafeAreaView>
  )
}
