import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Frequency, frequencyEnum, type SeriesOut } from '@/gen'

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  [frequencyEnum.weekly]: 'Weekly',
  [frequencyEnum.fortnightly]: 'Fortnightly',
  [frequencyEnum.every_3_weeks]: 'Every 3 weeks',
  [frequencyEnum.every_4_weeks]: 'Every 4 weeks',
}

export type SeriesFormValues = {
  frequency: Frequency
  start_date: string
  default_time: string
  duration_minutes: string
}

export function SeriesForm({
  series,
  defaultStartDate,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  /** When set, this is an edit ("this and following") — start date is fixed. */
  series?: SeriesOut
  defaultStartDate?: string
  submitLabel: string
  pending: boolean
  error?: string | null
  onSubmit: (values: SeriesFormValues) => void
}) {
  const [values, setValues] = useState<SeriesFormValues>({
    frequency: series?.frequency ?? frequencyEnum.fortnightly,
    start_date: series?.start_date ?? defaultStartDate ?? new Date().toISOString().slice(0, 10),
    default_time: series?.default_time?.slice(0, 5) ?? '',
    duration_minutes: String(series?.duration_minutes ?? 60),
  })

  const set = <K extends keyof SeriesFormValues>(key: K, value: SeriesFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(values)
      }}
    >
      <div className="grid gap-2">
        <Label>Repeats</Label>
        <Select value={values.frequency} onValueChange={(v) => set('frequency', v as Frequency)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!series && (
        <div className="grid gap-2">
          <Label htmlFor="sf-start">First visit</Label>
          <Input
            id="sf-start"
            type="date"
            required
            value={values.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sf-time">Time (optional)</Label>
          <Input
            id="sf-time"
            type="time"
            value={values.default_time}
            onChange={(e) => set('default_time', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sf-duration">Duration (min)</Label>
          <Input
            id="sf-duration"
            type="number"
            min="5"
            step="5"
            required
            value={values.duration_minutes}
            onChange={(e) => set('duration_minutes', e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
