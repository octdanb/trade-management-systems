import { useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, Text } from 'react-native'

import { Button, Chips, Field, LoadingState, SwitchRow } from '../../src/components/ui'
import {
  type JobStatus,
  jobStatusEnum,
  useDeleteJob,
  useListJobs,
  useUpdateJob,
} from '../../src/gen'
import { addDays } from '../../src/lib/format'
import { JOBS_BASE_KEY, ROUTE_BASE_KEY } from '../../src/lib/query-keys'

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
        <Text className="mb-4 text-xs text-muted-foreground">
          {job.series_id ? 'Repeating visit — changes apply to this one only.' : 'One-off visit'}
        </Text>

        <Field
          label="Date (YYYY-MM-DD)"
          value={form.scheduled_date}
          autoCapitalize="none"
          onChangeText={(v) => set('scheduled_date', v)}
        />
        <Field
          label="Time (HH:MM, optional)"
          value={form.scheduled_time}
          autoCapitalize="none"
          onChangeText={(v) => set('scheduled_time', v)}
        />
        <Field
          label="Price ($)"
          value={form.price}
          keyboardType="decimal-pad"
          onChangeText={(v) => set('price', v)}
        />
        <Text className="mb-1 text-sm font-medium text-foreground">Status</Text>
        <Chips options={STATUS_OPTIONS} value={form.status} onChange={(v) => set('status', v)} />
        <SwitchRow label="Paid" value={form.paid} onChange={(v) => set('paid', v)} />
        <Field label="Notes" value={form.notes} multiline onChangeText={(v) => set('notes', v)} />

        <SaveDeleteButtons jobId={jobId} isSeries={!!job.series_id} form={form} />
      </ScrollView>
    </>
  )
}

function SaveDeleteButtons({
  jobId,
  isSeries,
  form,
}: {
  jobId: number
  isSeries: boolean
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
  const deleteJob = useDeleteJob({ mutation: { onSuccess: onDone } })

  return (
    <>
      {(updateJob.isError || deleteJob.isError) && (
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
      {!isSeries && (
        <Button
          title="Delete visit"
          variant="ghost"
          className="mt-2"
          onPress={() =>
            Alert.alert('Delete visit', 'Remove this one-off visit?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteJob.mutate({ job_id: jobId }),
              },
            ])
          }
        />
      )}
    </>
  )
}
