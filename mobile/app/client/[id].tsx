import { useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

import { ClientForm, clientToValues } from '../../src/components/client-form'
import { Badge, Button, Card, Chips, Field, LoadingState } from '../../src/components/ui'
import {
  type Frequency,
  frequencyEnum,
  useCreateSeries,
  useDeleteClient,
  useEndSeries,
  useGeocodeClient,
  useGetClient,
  useListSeries,
  useUpdateClient,
} from '../../src/gen'
import { todayString } from '../../src/lib/format'
import { CLIENTS_BASE_KEY, JOBS_BASE_KEY } from '../../src/lib/query-keys'

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  every_3_weeks: 'Every 3 weeks',
  every_4_weeks: 'Every 4 weeks',
}

const FREQUENCY_OPTIONS = (Object.keys(FREQUENCY_LABELS) as Frequency[]).map((value) => ({
  value,
  label: FREQUENCY_LABELS[value],
}))

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const clientId = Number(id)
  const router = useRouter()
  const queryClient = useQueryClient()

  const client = useGetClient(clientId)
  const series = useListSeries({ client_id: clientId })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CLIENTS_BASE_KEY })
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
    queryClient.invalidateQueries({ queryKey: [{ url: '/api/series' }] })
    queryClient.invalidateQueries({
      queryKey: [{ url: '/api/clients/:client_id', params: { client_id: clientId } }],
    })
  }

  const updateClient = useUpdateClient({ mutation: { onSuccess: invalidate } })
  const geocodeClient = useGeocodeClient({ mutation: { onSuccess: invalidate } })
  const deleteClient = useDeleteClient({
    mutation: {
      onSuccess: () => {
        invalidate()
        router.back()
      },
    },
  })
  const createSeries = useCreateSeries({ mutation: { onSuccess: invalidate } })
  const endSeries = useEndSeries({ mutation: { onSuccess: invalidate } })

  const [addingSeries, setAddingSeries] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>(frequencyEnum.fortnightly)
  const [startDate, setStartDate] = useState(todayString())
  const [time, setTime] = useState('')

  if (client.isLoading || !client.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Client' }} />
        {client.isLoading ? (
          <LoadingState />
        ) : (
          <Text className="p-6 text-sm text-red-600">Client not found.</Text>
        )}
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: client.data.name }} />
      <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
        {/* Geocode state */}
        {client.data.address ? (
          <View className="mb-4 flex-row items-center gap-2">
            {client.data.geocode_status === 'ok' ? (
              <Badge text="Address located" tone="green" />
            ) : client.data.geocode_status === 'failed' ? (
              <>
                <Badge text="Address not found" tone="red" />
                <Button
                  title="Retry"
                  variant="outline"
                  className="px-3 py-1.5"
                  loading={geocodeClient.isPending}
                  onPress={() => geocodeClient.mutate({ client_id: clientId })}
                />
              </>
            ) : (
              <Badge text="Not geocoded yet" />
            )}
          </View>
        ) : null}

        {/* Repeating appointments */}
        <Card className="mb-5">
          <Text className="mb-2 font-semibold text-foreground">Repeating appointments</Text>
          {series.data?.length ? (
            series.data.map((s) => (
              <View
                key={s.id}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-border p-3"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    {FREQUENCY_LABELS[s.frequency]}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    From {s.start_date}
                    {s.default_time ? ` at ${s.default_time.slice(0, 5)}` : ''}
                    {s.end_date ? ` — ends ${s.end_date}` : ''}
                  </Text>
                </View>
                {!s.end_date && (
                  <Button
                    title="End"
                    variant="outline"
                    className="px-3 py-1.5"
                    onPress={() =>
                      Alert.alert('End series', 'Stop this repeating appointment from today?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'End series',
                          style: 'destructive',
                          onPress: () =>
                            endSeries.mutate({
                              series_id: s.id,
                              data: { end_date: todayString() },
                            }),
                        },
                      ])
                    }
                  />
                )}
              </View>
            ))
          ) : (
            <Text className="mb-2 text-sm text-muted-foreground">None yet.</Text>
          )}

          {addingSeries ? (
            <View className="mt-2">
              <Text className="mb-1 text-sm font-medium text-foreground">How often</Text>
              <Chips options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
              <Field
                label="First visit (YYYY-MM-DD)"
                className="mt-3"
                value={startDate}
                autoCapitalize="none"
                onChangeText={setStartDate}
              />
              <Field
                label="Time (HH:MM, optional)"
                value={time}
                autoCapitalize="none"
                onChangeText={setTime}
              />
              <Button
                title={createSeries.isPending ? 'Creating…' : 'Create'}
                loading={createSeries.isPending}
                onPress={() =>
                  createSeries.mutate(
                    {
                      data: {
                        client_id: clientId,
                        frequency,
                        start_date: startDate,
                        default_time: time || null,
                      },
                    },
                    { onSuccess: () => setAddingSeries(false) },
                  )
                }
              />
            </View>
          ) : (
            <Button
              title="Add repeating appointment"
              variant="outline"
              onPress={() => setAddingSeries(true)}
            />
          )}
        </Card>

        {/* Details */}
        <Text className="mb-2 font-semibold text-foreground">Details</Text>
        <ClientForm
          initial={clientToValues(client.data)}
          submitLabel="Save changes"
          pending={updateClient.isPending}
          error={updateClient.isError ? 'Could not save changes.' : null}
          onSubmit={(data) => updateClient.mutate({ client_id: clientId, data })}
        />
        <Button
          title="Delete client"
          variant="ghost"
          className="mt-3"
          onPress={() =>
            Alert.alert(
              'Delete client',
              'Delete this client and ALL their appointments and history? Marking them inactive is usually better.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteClient.mutate({ client_id: clientId }),
                },
              ],
            )
          }
        />
      </ScrollView>
    </>
  )
}
