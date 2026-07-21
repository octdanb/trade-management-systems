import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { ClientForm, clientToValues } from '../../src/components/client-form'
import { Badge, Button, Card, Chips, Field, LoadingState, TimeField } from '../../src/components/ui'
import {
  type ClientOut,
  type Frequency,
  frequencyEnum,
  useCreateClientNote,
  useCreateSeries,
  useDeleteClient,
  useDeleteClientNote,
  useDeleteClientPhoto,
  useEndSeries,
  useGeocodeClient,
  useGetClient,
  useListSeries,
  useUpdateClient,
} from '../../src/gen'
import { api } from '../../src/lib/api'
import { formatDate, formatDateTime, formatTime, todayString } from '../../src/lib/format'
import { googleMapsSearchUrl } from '../../src/lib/maps'
import { CLIENTS_BASE_KEY, JOBS_BASE_KEY } from '../../src/lib/query-keys'
import { absoluteMediaUrl } from '../(tabs)/equipment'

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

  const [editing, setEditing] = useState(false)
  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        invalidate()
        setEditing(false)
      },
    },
  })
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
  const item = client.data

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
        {/* Geocode state */}
        {item.address ? (
          <View className="mb-4 flex-row items-center gap-2">
            {item.geocode_status === 'ok' ? (
              <Badge text="Address located" tone="green" />
            ) : item.geocode_status === 'failed' ? (
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

        {/* Details: read-only with an Edit toggle */}
        <Card className="mb-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-foreground">Details</Text>
            <Button
              title={editing ? 'Cancel' : 'Edit'}
              variant="outline"
              className="px-3 py-1.5"
              onPress={() => setEditing(!editing)}
            />
          </View>
          {editing ? (
            <>
              <ClientForm
                initial={clientToValues(item)}
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
            </>
          ) : (
            <ClientDetails client={item} />
          )}
        </Card>

        {/* Notes log */}
        <NotesCard client={item} onChanged={invalidate} />

        {/* Photos */}
        <PhotosCard client={item} onChanged={invalidate} />

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
                    From {formatDate(s.start_date)}
                    {s.default_time ? ` at ${formatTime(s.default_time)}` : ''}
                    {s.end_date ? ` — ends ${formatDate(s.end_date)}` : ''}
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
              <TimeField label="Time (optional)" value={time} onChange={setTime} />
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
      </ScrollView>
    </>
  )
}

/** Read-only details; phone/email/address open the matching app. */
function ClientDetails({ client }: { client: ClientOut }) {
  return (
    <View>
      <DetailRow
        icon="call-outline"
        label="Phone"
        value={client.phone}
        onPress={client.phone ? () => Linking.openURL(`tel:${client.phone}`) : undefined}
      />
      <DetailRow
        icon="mail-outline"
        label="Email"
        value={client.email}
        onPress={client.email ? () => Linking.openURL(`mailto:${client.email}`) : undefined}
      />
      <DetailRow
        icon="location-outline"
        label="Address"
        value={client.address}
        onPress={
          client.address ? () => Linking.openURL(googleMapsSearchUrl(client.address)) : undefined
        }
      />
      <DetailRow icon="cash-outline" label="Rate per visit" value={`$${client.rate}`} />
      <DetailRow icon="wallet-outline" label="Cost per visit" value={`$${client.cost}`} />
      <View className="mt-1 flex-row items-center gap-2">
        <Badge
          text={client.is_active ? 'Active' : 'Inactive'}
          tone={client.is_active ? 'green' : 'neutral'}
        />
      </View>
      {client.notes ? (
        <View className="mt-3 rounded-xl bg-muted px-3 py-2">
          <Text className="text-xs text-muted-foreground">General notes</Text>
          <Text className="text-sm text-foreground">{client.notes}</Text>
        </View>
      ) : null}
    </View>
  )
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
}) {
  const content = (
    <View className="flex-row items-center gap-3 py-2.5">
      <Ionicons name={icon} size={18} color="#737373" />
      <View className="flex-1">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text
          className={`text-sm ${value ? (onPress ? 'text-primary underline' : 'text-foreground') : 'text-muted-foreground'}`}
        >
          {value || '—'}
        </Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={16} color="#a3a3a3" />}
    </View>
  )
  return onPress ? (
    <Pressable className="active:opacity-70" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  )
}

/** Dated note log. */
function NotesCard({ client, onChanged }: { client: ClientOut; onChanged: () => void }) {
  const [body, setBody] = useState('')
  const createNote = useCreateClientNote({
    mutation: {
      onSuccess: () => {
        setBody('')
        onChanged()
      },
    },
  })
  const deleteNote = useDeleteClientNote({ mutation: { onSuccess: onChanged } })

  return (
    <Card className="mb-5">
      <Text className="mb-2 font-semibold text-foreground">Notes</Text>
      <Field
        label="Add a note"
        placeholder="Gate code changed, quoted the hedge…"
        value={body}
        multiline
        onChangeText={setBody}
      />
      {createNote.isError && (
        <Text className="mb-2 text-sm text-red-600">Could not add the note.</Text>
      )}
      <Button
        title={createNote.isPending ? 'Adding…' : 'Add note'}
        variant="outline"
        className="mb-3 px-3 py-2"
        loading={createNote.isPending}
        disabled={!body.trim()}
        onPress={() => createNote.mutate({ client_id: client.id, data: { body } })}
      />
      {client.note_entries.length ? (
        client.note_entries.map((note) => (
          <View
            key={note.id}
            className="mb-2 flex-row items-start justify-between rounded-xl border border-border p-3"
          >
            <View className="flex-1 pr-2">
              <Text className="text-xs text-muted-foreground">
                {formatDateTime(note.created_at)}
              </Text>
              <Text className="text-sm text-foreground">{note.body}</Text>
            </View>
            <Pressable
              className="p-1.5"
              onPress={() =>
                Alert.alert('Delete note', 'Remove this note?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteNote.mutate({ client_id: client.id, note_id: note.id }),
                  },
                ])
              }
            >
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
            </Pressable>
          </View>
        ))
      ) : (
        <Text className="text-sm text-muted-foreground">No notes yet.</Text>
      )}
    </Card>
  )
}

/** Photo gallery for a client. */
function PhotosCard({ client, onChanged }: { client: ClientOut; onChanged: () => void }) {
  const uploadPhoto = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const form = new FormData()
      // React Native FormData file part: {uri, name, type}
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob)
      await api.post(`/api/clients/${client.id}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: onChanged,
  })
  const deletePhoto = useDeleteClientPhoto({ mutation: { onSuccess: onChanged } })

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      uploadPhoto.mutate(result.assets[0])
    }
  }

  return (
    <Card className="mb-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-semibold text-foreground">Photos</Text>
        <Button
          title={uploadPhoto.isPending ? 'Uploading…' : 'Add photo'}
          variant="outline"
          className="px-3 py-1.5"
          loading={uploadPhoto.isPending}
          onPress={pickPhoto}
        />
      </View>
      {uploadPhoto.isError && (
        <Text className="mb-2 text-sm text-red-600">Upload failed. Try again.</Text>
      )}
      {client.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {client.photos.map((photo) => (
              <Pressable
                key={photo.id}
                onLongPress={() =>
                  Alert.alert('Delete photo', 'Remove this photo?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () =>
                        deletePhoto.mutate({ client_id: client.id, photo_id: photo.id }),
                    },
                  ])
                }
              >
                <Image
                  source={{ uri: absoluteMediaUrl(photo.url) }}
                  className="h-28 w-28 rounded-xl"
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text className="text-sm text-muted-foreground">
          No photos yet — lawn, access, before &amp; after. (Long-press a photo to delete it.)
        </Text>
      )}
    </Card>
  )
}
