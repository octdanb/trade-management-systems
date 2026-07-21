import { useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text } from 'react-native'

import { Button, Chips, Field, LoadingState, SwitchRow, TimeField } from '../src/components/ui'
import {
  type Frequency,
  frequencyEnum,
  type JobKind,
  jobKindEnum,
  useCreateJob,
  useCreateSeries,
  useListClients,
} from '../src/gen'
import { todayString } from '../src/lib/format'
import { JOBS_BASE_KEY, ROUTE_BASE_KEY } from '../src/lib/query-keys'

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: frequencyEnum.weekly, label: 'Weekly' },
  { value: frequencyEnum.fortnightly, label: 'Fortnightly' },
  { value: frequencyEnum.every_3_weeks, label: 'Every 3 wks' },
  { value: frequencyEnum.every_4_weeks, label: 'Every 4 wks' },
]

export default function NewAppointmentScreen() {
  const { date: dateParam, client_id: clientParam } = useLocalSearchParams<{
    date?: string
    client_id?: string
  }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const clients = useListClients({ active: true })
  const [clientId, setClientId] = useState<string>(clientParam ?? '')
  const [kind, setKind] = useState<JobKind>(jobKindEnum.job)
  const [date, setDate] = useState(dateParam ?? todayString())
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>(frequencyEnum.fortnightly)
  const isQuote = kind === jobKindEnum.quote

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
    queryClient.invalidateQueries({ queryKey: ROUTE_BASE_KEY })
    router.back()
  }
  const createJob = useCreateJob({ mutation: { onSuccess: onDone } })
  const createSeries = useCreateSeries({ mutation: { onSuccess: onDone } })
  const active = recurring ? createSeries : createJob

  function submit() {
    if (!clientId) return
    if (recurring && !isQuote) {
      createSeries.mutate({
        data: {
          client_id: Number(clientId),
          frequency,
          start_date: date,
          default_time: time || null,
        },
      })
    } else {
      createJob.mutate({
        data: {
          client_id: Number(clientId),
          scheduled_date: date,
          scheduled_time: time || null,
          kind,
          ...(isQuote ? { price: '0' } : {}),
          notes,
        },
      })
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New appointment', presentation: 'modal' }} />
      <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
        {clients.isLoading ? (
          <LoadingState />
        ) : clients.data?.length ? (
          <>
            <Text className="mb-1 text-sm font-medium text-foreground">Client</Text>
            <Chips
              options={clients.data.map((c) => ({ value: String(c.id), label: c.name }))}
              value={clientId}
              onChange={setClientId}
            />
            <Text className="mb-1 mt-4 text-sm font-medium text-foreground">Type</Text>
            <Chips
              options={[
                { value: jobKindEnum.job, label: 'Visit' },
                { value: jobKindEnum.quote, label: 'Quote' },
              ]}
              value={kind}
              onChange={(v) => {
                setKind(v)
                if (v === jobKindEnum.quote) setRecurring(false)
              }}
            />
            {isQuote && (
              <Text className="mt-1 text-xs text-muted-foreground">
                A quote visit — no charge; add notes and photos, then convert it to a job when it's
                accepted.
              </Text>
            )}
            <Field
              label="Date (YYYY-MM-DD)"
              className="mt-4"
              value={date}
              autoCapitalize="none"
              onChangeText={setDate}
            />
            <TimeField label="Time (optional)" value={time} onChange={setTime} />
            {isQuote && (
              <Field
                label="Notes"
                placeholder="What they want quoted…"
                value={notes}
                multiline
                onChangeText={setNotes}
              />
            )}
            {!isQuote && <SwitchRow label="Repeats" value={recurring} onChange={setRecurring} />}
            {recurring && !isQuote && (
              <>
                <Text className="mb-1 text-sm font-medium text-foreground">How often</Text>
                <Chips options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
              </>
            )}
            {active.isError && (
              <Text className="mt-3 text-sm text-red-600">Could not create the appointment.</Text>
            )}
            <Button
              title={
                active.isPending
                  ? 'Creating…'
                  : isQuote
                    ? 'Create quote appointment'
                    : recurring
                      ? 'Create repeating visit'
                      : 'Create one-off visit'
              }
              className="mt-4"
              loading={active.isPending}
              disabled={!clientId}
              onPress={submit}
            />
          </>
        ) : (
          <Text className="text-sm text-muted-foreground">
            No active clients yet — add one on the Clients tab first.
          </Text>
        )}
      </ScrollView>
    </>
  )
}
