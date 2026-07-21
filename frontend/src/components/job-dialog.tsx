import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { SeriesForm } from '@/components/series-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  statusEnum,
  useCreateJob,
  useCreateSeries,
  useDeleteJob,
  useListClients,
  useUpdateJob,
  useUpdateSeries,
  type JobOut,
  type Status,
} from '@/gen'
import { JOBS_BASE_KEY } from '@/lib/query-keys'

const STATUS_LABELS: Record<Status, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
}

/** Create a one-off job or a new series, starting from a clicked date. */
export function CreateJobDialog({
  date,
  open,
  onOpenChange,
}: {
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const clients = useListClients({ active: true }, { query: { enabled: open } })

  const [clientId, setClientId] = useState<string>('')
  const [recurring, setRecurring] = useState(false)
  const [time, setTime] = useState('')

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
    onOpenChange(false)
    setClientId('')
    setRecurring(false)
    setTime('')
  }

  const createJob = useCreateJob({ mutation: { onSuccess: onDone } })
  const createSeries = useCreateSeries({ mutation: { onSuccess: onDone } })

  const clientPicker = (
    <div className="grid gap-2">
      <Label>Client</Label>
      <Select value={clientId} onValueChange={setClientId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pick a client" />
        </SelectTrigger>
        <SelectContent>
          {clients.data?.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clients.data?.length === 0 && (
        <p className="text-xs text-muted-foreground">No active clients yet — add one first.</p>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {clientPicker}
          <div className="flex items-center gap-2">
            <Checkbox
              id="jd-recurring"
              checked={recurring}
              onCheckedChange={(v) => setRecurring(v === true)}
            />
            <Label htmlFor="jd-recurring">Repeats</Label>
          </div>
          {recurring ? (
            <SeriesForm
              defaultStartDate={date}
              submitLabel="Create recurring appointment"
              pending={createSeries.isPending}
              error={createSeries.isError ? 'Could not create the series.' : null}
              onSubmit={(v) => {
                if (!clientId) return
                createSeries.mutate({
                  data: {
                    client_id: Number(clientId),
                    frequency: v.frequency,
                    start_date: v.start_date,
                    default_time: v.default_time || null,
                    duration_minutes: Number(v.duration_minutes) || 60,
                  },
                })
              }}
            />
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!clientId) return
                createJob.mutate({
                  data: {
                    client_id: Number(clientId),
                    scheduled_date: date,
                    scheduled_time: time || null,
                  },
                })
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="jd-time">Time (optional)</Label>
                <Input id="jd-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              {createJob.isError && (
                <p className="text-sm text-destructive">Could not create the appointment.</p>
              )}
              <Button type="submit" disabled={createJob.isPending || !clientId}>
                {createJob.isPending ? 'Creating…' : 'Create one-off visit'}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Edit a single job occurrence: reschedule, price, status, paid, notes. */
export function EditJobDialog({
  job,
  open,
  onOpenChange,
  onEditSeries,
}: {
  job: JobOut | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditSeries?: (job: JobOut) => void
}) {
  const queryClient = useQueryClient()

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<Status>(statusEnum.scheduled)
  const [paid, setPaid] = useState(false)
  const [notes, setNotes] = useState('')
  const [loadedJobId, setLoadedJobId] = useState<number | null>(null)

  // Sync form state when a (new) job is opened.
  if (job && job.id !== loadedJobId) {
    setLoadedJobId(job.id)
    setDate(job.scheduled_date)
    setTime(job.scheduled_time?.slice(0, 5) ?? '')
    setPrice(String(job.price))
    setStatus(job.status)
    setPaid(job.paid)
    setNotes(job.notes)
  }

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
    onOpenChange(false)
  }

  const updateJob = useUpdateJob({ mutation: { onSuccess: onDone } })
  const deleteJob = useDeleteJob({ mutation: { onSuccess: onDone } })

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{job.client_name}</DialogTitle>
          <DialogDescription>
            {job.series_id ? 'Recurring visit' : 'One-off visit'} · ${job.price}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            updateJob.mutate({
              job_id: job.id,
              data: {
                scheduled_date: date,
                scheduled_time: time || null,
                price,
                status,
                paid,
                notes,
              },
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ej-date">Date</Label>
              <Input id="ej-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ej-time">Time</Label>
              <Input id="ej-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ej-price">Price ($)</Label>
              <Input
                id="ej-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ej-paid" checked={paid} onCheckedChange={(v) => setPaid(v === true)} />
            <Label htmlFor="ej-paid">Paid</Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ej-notes">Notes</Label>
            <Textarea id="ej-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {(updateJob.isError || deleteJob.isError) && (
            <p className="text-sm text-destructive">Could not save the changes.</p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={updateJob.isPending}>
              {updateJob.isPending ? 'Saving…' : 'Save'}
            </Button>
            {job.series_id && onEditSeries ? (
              <Button type="button" variant="outline" onClick={() => onEditSeries(job)}>
                Edit series from this date…
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deleteJob.isPending}
                onClick={() => deleteJob.mutate({ job_id: job.id })}
              >
                Delete visit
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** "This and following" series edit, anchored at a job's date. */
export function EditSeriesDialog({
  job,
  open,
  onOpenChange,
}: {
  job: JobOut | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const updateSeries = useUpdateSeries({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
        onOpenChange(false)
      },
    },
  })

  if (!job?.series_id) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit series</DialogTitle>
          <DialogDescription>
            Changes apply to {job.client_name}'s visits from {job.scheduled_date} onward. Completed
            and individually-moved visits are kept.
          </DialogDescription>
        </DialogHeader>
        <SeriesForm
          key={job.id}
          series={undefined}
          defaultStartDate={job.scheduled_date}
          submitLabel="Apply to future visits"
          pending={updateSeries.isPending}
          error={updateSeries.isError ? 'Could not update the series.' : null}
          onSubmit={(v) =>
            updateSeries.mutate({
              series_id: job.series_id!,
              params: { apply_from: job.scheduled_date },
              data: {
                frequency: v.frequency,
                default_time: v.default_time || null,
                duration_minutes: Number(v.duration_minutes) || 60,
              },
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
