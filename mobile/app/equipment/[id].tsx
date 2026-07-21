import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { EquipmentForm, equipmentToValues } from '../../src/components/equipment-form'
import { Badge, Button, Card, Field, LoadingState } from '../../src/components/ui'
import {
  useDeleteEquipment,
  useDeleteEquipmentPhoto,
  useDeleteServiceRecord,
  useGetEquipment,
  useLogService,
  useUpdateEquipment,
} from '../../src/gen'
import { api } from '../../src/lib/api'
import { todayString } from '../../src/lib/format'
import { EQUIPMENT_BASE_KEY } from '../../src/lib/query-keys'
import { absoluteMediaUrl, serviceDueTone } from '../(tabs)/equipment'

export default function EquipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const equipmentId = Number(id)
  const router = useRouter()
  const queryClient = useQueryClient()

  const equipment = useGetEquipment(equipmentId)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: EQUIPMENT_BASE_KEY })
    queryClient.invalidateQueries({
      queryKey: [{ url: '/api/equipment/:equipment_id', params: { equipment_id: equipmentId } }],
    })
  }

  const updateEquipment = useUpdateEquipment({ mutation: { onSuccess: invalidate } })
  const deletePhoto = useDeleteEquipmentPhoto({ mutation: { onSuccess: invalidate } })
  const deleteRecord = useDeleteServiceRecord({ mutation: { onSuccess: invalidate } })
  const logService = useLogService({ mutation: { onSuccess: invalidate } })
  const deleteEquipment = useDeleteEquipment({
    mutation: {
      onSuccess: () => {
        invalidate()
        router.back()
      },
    },
  })

  // Photo upload: pick from the library or camera, send as multipart.
  const uploadPhoto = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const form = new FormData()
      // React Native FormData file part: {uri, name, type}
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob)
      await api.post(`/api/equipment/${equipmentId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: invalidate,
  })

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      uploadPhoto.mutate(result.assets[0])
    }
  }

  const [serviceDate, setServiceDate] = useState(todayString())
  const [serviceNotes, setServiceNotes] = useState('')
  const [serviceCost, setServiceCost] = useState('')
  const [loggingService, setLoggingService] = useState(false)

  if (equipment.isLoading || !equipment.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Equipment' }} />
        {equipment.isLoading ? (
          <LoadingState />
        ) : (
          <Text className="p-6 text-sm text-red-600">Equipment not found.</Text>
        )}
      </>
    )
  }
  const item = equipment.data
  const due = item.status === 'active' ? serviceDueTone(item.next_service_due) : null

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
        {due && (
          <View className="mb-3 flex-row">
            <Badge text={due.text} tone={due.tone} />
          </View>
        )}

        {/* Photos */}
        <Card className="mb-4">
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
          {item.photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {item.photos.map((photo) => (
                  <Pressable
                    key={photo.id}
                    onLongPress={() =>
                      Alert.alert('Delete photo', 'Remove this photo?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () =>
                            deletePhoto.mutate({ equipment_id: equipmentId, photo_id: photo.id }),
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
              No photos yet — snap the serial plate and general condition. (Long-press a photo to
              delete it.)
            </Text>
          )}
        </Card>

        {/* Service history */}
        <Card className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-foreground">Service history</Text>
            <Button
              title="Log service"
              variant="outline"
              className="px-3 py-1.5"
              onPress={() => setLoggingService(!loggingService)}
            />
          </View>
          {(item.service_contact_name || item.service_contact_phone) && (
            <Pressable
              className="mb-2 flex-row items-center gap-2 rounded-xl bg-muted px-3 py-2"
              onPress={() =>
                item.service_contact_phone && Linking.openURL(`tel:${item.service_contact_phone}`)
              }
            >
              <Ionicons name="call-outline" size={14} color="#737373" />
              <Text className="text-sm text-foreground">
                {[item.service_contact_name, item.service_contact_phone]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Pressable>
          )}
          {loggingService && (
            <View className="mb-3 rounded-xl border border-border p-3">
              <Field
                label="Date (YYYY-MM-DD)"
                value={serviceDate}
                autoCapitalize="none"
                onChangeText={setServiceDate}
              />
              <Field
                label="Cost ($, optional)"
                value={serviceCost}
                keyboardType="decimal-pad"
                onChangeText={setServiceCost}
              />
              <Field
                label="What was done"
                value={serviceNotes}
                multiline
                placeholder="Oil change, new blades…"
                onChangeText={setServiceNotes}
              />
              <Button
                title={logService.isPending ? 'Saving…' : 'Save service'}
                loading={logService.isPending}
                onPress={() =>
                  logService.mutate(
                    {
                      equipment_id: equipmentId,
                      data: {
                        serviced_on: serviceDate,
                        notes: serviceNotes,
                        cost: serviceCost || null,
                      },
                    },
                    { onSuccess: () => setLoggingService(false) },
                  )
                }
              />
            </View>
          )}
          {item.service_records.length ? (
            item.service_records.map((record) => (
              <View
                key={record.id}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-border p-3"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    {record.serviced_on}
                    {record.cost != null ? `  ·  $${record.cost}` : ''}
                  </Text>
                  {record.notes ? (
                    <Text className="text-xs text-muted-foreground">{record.notes}</Text>
                  ) : null}
                </View>
                <Pressable
                  className="p-1.5"
                  onPress={() =>
                    deleteRecord.mutate({ equipment_id: equipmentId, record_id: record.id })
                  }
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </Pressable>
              </View>
            ))
          ) : (
            <Text className="text-sm text-muted-foreground">No services logged yet.</Text>
          )}
        </Card>

        {/* Details */}
        <Text className="mb-2 font-semibold text-foreground">Details</Text>
        <EquipmentForm
          initial={equipmentToValues(item)}
          submitLabel="Save changes"
          pending={updateEquipment.isPending}
          error={updateEquipment.isError ? 'Could not save changes.' : null}
          onSubmit={(data) => updateEquipment.mutate({ equipment_id: equipmentId, data })}
        />
        <Button
          title="Delete equipment"
          variant="ghost"
          className="mt-3"
          onPress={() =>
            Alert.alert('Delete equipment', 'Delete this equipment, its photos and history?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteEquipment.mutate({ equipment_id: equipmentId }),
              },
            ])
          }
        />
      </ScrollView>
    </>
  )
}
