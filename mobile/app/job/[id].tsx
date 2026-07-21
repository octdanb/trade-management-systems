import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'

import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  LoadingState,
  SwitchRow,
  TimeField,
} from '../../src/components/ui'
import {
  type JobOut,
  type JobStatus,
  jobKindEnum,
  jobStatusEnum,
  useDeleteJob,
  useDeleteJobPhoto,
  useListJobs,
  useUpdateJob,
} from '../../src/gen'
import { api } from '../../src/lib/api'
import { addDays } from '../../src/lib/format'
import { JOBS_BASE_KEY, ROUTE_BASE_KEY } from '../../src/lib/query-keys'
import { absoluteMediaUrl } from '../(tabs)/equipment'

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: jobStatusEnum.scheduled, label: 'Scheduled' },
  { value: jobStatusEnum.completed, label: 'Completed' },
  { value: jobStatusEnum.skipped, label: 'Skipped' },
  { value: jobStatusEnum.cancelled, label: 'Cancelled' },
]

export default function JobScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>()
  const jobId = Number(id)

  // There's no single-job endpoint; fetch a window around the job's date
  // (passed as a param from the list, falling back to a wide window).
  const anchor = date ?? addDays(new Date().toISOString().slice(0, 10), 0)
  const jobs = useListJobs({ start: addDays(anchor, -90), end: addDays(anchor, 90) })
  const job = jobs.data?.find((j) => j.id === jobId)

  const [values, setValues] = useState<{
    scheduled_date: string
    scheduled_time: string
    price: string
    status: JobStatus
    paid: boolean
    notes: string
  } | null>(null)

  if (jobs.isLoading || !job) {
    return (
      <>
        <Stack.Screen options={{ title: 'Visit' }} />
        {jobs.isLoading ? (
          <LoadingState />
        ) : (
          <Text className="p-6 text-sm text-red-600">Visit not found.</Text>
        )}
      </>
    )
  }

  const isQuote = job.kind === jobKindEnum.quote
  const form = values ?? {
    scheduled_date: job.scheduled_date,
    scheduled_time: job.scheduled_time?.slice(0, 5) ?? '',
    price: String(job.price),
    status: job.status,
    paid: job.paid,
    notes: job.notes,
  }
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setValues({ ...form, [key]: value })

  return (
    <>
      <Stack.Screen options={{ title: job.client_name }} />
      <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
        <View className="mb-4 flex-row items-center gap-2">
          {isQuote && <Badge text="Quote" tone="amber" />}
          <Text className="text-xs text-muted-foreground">
            {isQuote
              ? 'Quote appointment — no charge until accepted.'
              : job.series_id
                ? 'Repeating visit — changes apply to this one only.'
                : 'One-off visit'}
          </Text>
        </View>

        <Field
          label="Date (YYYY-MM-DD)"
          value={form.scheduled_date}
          autoCapitalize="none"
          onChangeText={(v) => set('scheduled_date', v)}
        />
        <TimeField
          label="Time (optional)"
          value={form.scheduled_time}
          onChange={(v) => set('scheduled_time', v)}
        />
        <Field
          label={isQuote ? 'Quoted price ($)' : 'Price ($)'}
          value={form.price}
          keyboardType="decimal-pad"
          onChangeText={(v) => set('price', v)}
        />
        <Text className="mb-1 text-sm font-medium text-foreground">Status</Text>
        <Chips options={STATUS_OPTIONS} value={form.status} onChange={(v) => set('status', v)} />
        {!isQuote && <SwitchRow label="Paid" value={form.paid} onChange={(v) => set('paid', v)} />}
        <Field
          label="Notes"
          value={form.notes}
          multiline
          placeholder={isQuote ? 'Measurements, access, what they asked for…' : undefined}
          onChangeText={(v) => set('notes', v)}
        />

        <JobPhotos job={job} />

        <SaveDeleteButtons jobId={jobId} isSeries={!!job.series_id} isQuote={isQuote} form={form} />
      </ScrollView>
    </>
  )
}

/** Photos attached to this job/quote. */
function JobPhotos({ job }: { job: JobOut }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })

  const uploadPhoto = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const form = new FormData()
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob)
      await api.post(`/api/jobs/${job.id}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: invalidate,
  })
  const deletePhoto = useDeleteJobPhoto({ mutation: { onSuccess: invalidate } })

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
    <Card className="mb-4 mt-1">
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
      {job.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {job.photos.map((photo) => (
              <Pressable
                key={photo.id}
                onLongPress={() =>
                  Alert.alert('Delete photo', 'Remove this photo?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deletePhoto.mutate({ job_id: job.id, photo_id: photo.id }),
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
        <View className="flex-row items-center gap-2">
          <Ionicons name="camera-outline" size={16} color="#a3a3a3" />
          <Text className="text-sm text-muted-foreground">
            {job.kind === jobKindEnum.quote
              ? 'Snap the site so the quote writes itself later.'
              : 'No photos yet. (Long-press a photo to delete it.)'}
          </Text>
        </View>
      )}
    </Card>
  )
}

function SaveDeleteButtons({
  jobId,
  isSeries,
  isQuote,
  form,
}: {
  jobId: number
  isSeries: boolean
  isQuote: boolean
  form: {
    scheduled_date: string
    scheduled_time: string
    price: string
    status: JobStatus
    paid: boolean
    notes: string
  }
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
    queryClient.invalidateQueries({ queryKey: ROUTE_BASE_KEY })
    router.back()
  }
  const updateJob = useUpdateJob({ mutation: { onSuccess: onDone } })
  const convertToJob = useUpdateJob({ mutation: { onSuccess: onDone } })
  const deleteJob = useDeleteJob({ mutation: { onSuccess: onDone } })

  return (
    <>
      {(updateJob.isError || deleteJob.isError || convertToJob.isError) && (
        <Text className="mb-2 text-sm text-red-600">Could not save the changes.</Text>
      )}
      <Button
        title={updateJob.isPending ? 'Saving…' : 'Save'}
        loading={updateJob.isPending}
        onPress={() =>
          updateJob.mutate({
            job_id: jobId,
            data: {
              scheduled_date: form.scheduled_date,
              scheduled_time: form.scheduled_time || null,
              price: form.price,
              status: form.status,
              paid: form.paid,
              notes: form.notes,
            },
          })
        }
      />
      {isQuote && (
        <Button
          title={convertToJob.isPending ? 'Converting…' : 'Accepted — convert to job'}
          variant="outline"
          className="mt-2"
          loading={convertToJob.isPending}
          onPress={() =>
            convertToJob.mutate({
              job_id: jobId,
              data: { kind: jobKindEnum.job, price: form.price },
            })
          }
        />
      )}
      {!isSeries && (
        <Button
          title={isQuote ? 'Delete quote' : 'Delete visit'}
          variant="ghost"
          className="mt-2"
          onPress={() =>
            Alert.alert(
              isQuote ? 'Delete quote' : 'Delete visit',
              isQuote ? 'Remove this quote appointment?' : 'Remove this one-off visit?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteJob.mutate({ job_id: jobId }),
                },
              ],
            )
          }
        />
      )}
    </>
  )
}
