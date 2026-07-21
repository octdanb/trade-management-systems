import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { SeriesForm } from '@/components/series-form'
import { TimeField } from '@/components/time-field'
import { Badge } from '@/components/ui/badge'
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
  type JobKind,
  type JobOut,
  type JobPhotoOut,
  type JobStatus,
  jobKindEnum,
  jobStatusEnum,
  useCreateJob,
  useCreateSeries,
  useDeleteJob,
  useDeleteJobPhoto,
  useListClients,
  useUpdateJob,
  useUpdateSeries,
} from '@/gen'
import { formatDate } from '@/lib/format'
import { axiosInstance } from '@/lib/kubb-client'
import { JOBS_BASE_KEY } from '@/lib/query-keys'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
}

/** Create a one-off visit, a quote appointment, or a new series. */
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
  const [kind, setKind] = useState<JobKind>(jobKindEnum.job)
  const [recurring, setRecurring] = useState(false)
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
    onOpenChange(false)
    setClientId('')
    setKind(jobKindEnum.job)
    setRecurring(false)
    setTime('')
    setNotes('')
  }

  const createJob = useCreateJob({ mutation: { onSuccess: onDone } })
  const createSeries = useCreateSeries({ mutation: { onSuccess: onDone } })

  const isQuote = kind === jobKindEnum.quote

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>{formatDate(date)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
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
              <p className="text-xs text-muted-foreground">
                No active clients yet — add one first.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex overflow-hidden rounded-md border">
              {(
                [
                  [jobKindEnum.job, 'Visit'],
                  [jobKindEnum.quote, 'Quote'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm transition-colors',
                    kind === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => {
                    setKind(value)
                    if (value === jobKindEnum.quote) setRecurring(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {isQuote && (
              <p className="text-xs text-muted-foreground">
                A quote visit — no charge; add notes and photos, then convert it to a job when it's
                accepted.
              </p>
            )}
          </div>

          {!isQuote && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="jd-recurring"
                checked={recurring}
                onCheckedChange={(v) => setRecurring(v === true)}
              />
              <Label htmlFor="jd-recurring">Repeats</Label>
            </div>
          )}

          {recurring && !isQuote ? (
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
                    kind,
                    ...(isQuote ? { price: '0' } : {}),
                    notes,
                  },
                })
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="jd-time">Time (optional)</Label>
                <TimeField id="jd-time" value={time} onChange={setTime} />
              </div>
              {isQuote && (
                <div className="grid gap-2">
                  <Label htmlFor="jd-notes">Notes</Label>
                  <Textarea
                    id="jd-notes"
                    placeholder="What they want quoted…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}
              {createJob.isError && (
                <p className="text-sm text-destructive">Could not create the appointment.</p>
              )}
              <Button type="submit" disabled={createJob.isPending || !clientId}>
                {createJob.isPending
                  ? 'Creating…'
                  : isQuote
                    ? 'Create quote appointment'
                    : 'Create one-off visit'}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Edit a single job/quote: reschedule, price, status, paid, notes, photos. */
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
  const [status, setStatus] = useState<JobStatus>(jobStatusEnum.scheduled)
  const [paid, setPaid] = useState(false)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<JobPhotoOut[]>([])
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
    setPhotos(job.photos)
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
  const onDone = () => {
    invalidate()
    onOpenChange(false)
  }

  const updateJob = useUpdateJob({ mutation: { onSuccess: onDone } })
  const convertToJob = useUpdateJob({ mutation: { onSuccess: onDone } })
  const deleteJob = useDeleteJob({ mutation: { onSuccess: onDone } })

  const fileInput = useRef<HTMLInputElement>(null)
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const response = await axiosInstance.post<JobPhotoOut>(`/api/jobs/${job?.id}/photos`, form)
      return response.data
    },
    onSuccess: (photo) => {
      setPhotos((prev) => [photo, ...prev])
      invalidate()
    },
  })
  const deletePhoto = useDeleteJobPhoto({
    mutation: {
      onSuccess: (_data, variables) => {
        setPhotos((prev) => prev.filter((p) => p.id !== variables.photo_id))
        invalidate()
      },
    },
  })

  if (!job) return null
  const isQuote = job.kind === jobKindEnum.quote

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {job.client_name}
            {isQuote && <Badge>Quote</Badge>}
          </DialogTitle>
          <DialogDescription>
            {isQuote ? 'Quote appointment' : job.series_id ? 'Recurring visit' : 'One-off visit'}
            {!isQuote && ` · $${job.price}`}
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
              <Input
                id="ej-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ej-time">Time</Label>
              <TimeField id="ej-time" value={time} onChange={setTime} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ej-price">{isQuote ? 'Quoted price ($)' : 'Price ($)'}</Label>
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
              <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
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
          {!isQuote && (
            <div className="flex items-center gap-2">
              <Checkbox id="ej-paid" checked={paid} onCheckedChange={(v) => setPaid(v === true)} />
              <Label htmlFor="ej-paid">Paid</Label>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="ej-notes">Notes</Label>
            <Textarea
              id="ej-notes"
              placeholder={isQuote ? 'Measurements, access, what they asked for…' : undefined}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadPhoto.isPending}
                onClick={() => fileInput.current?.click()}
              >
                <Camera /> {uploadPhoto.isPending ? 'Uploading…' : 'Add photo'}
              </Button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadPhoto.mutate(file)
                e.target.value = ''
              }}
            />
            {uploadPhoto.isError && (
              <p className="text-sm text-destructive">Upload failed. Try again.</p>
            )}
            {photos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <a href={photo.url} target="_blank" rel="noreferrer">
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Job photo'}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    </a>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Delete photo"
                      onClick={() => deletePhoto.mutate({ job_id: job.id, photo_id: photo.id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isQuote ? 'Snap the site so the quote writes itself later.' : 'No photos.'}
              </p>
            )}
          </div>

          {(updateJob.isError || deleteJob.isError || convertToJob.isError) && (
            <p className="text-sm text-destructive">Could not save the changes.</p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={updateJob.isPending}>
              {updateJob.isPending ? 'Saving…' : 'Save'}
            </Button>
            {isQuote && (
              <Button
                type="button"
                variant="secondary"
                disabled={convertToJob.isPending}
                onClick={() =>
                  convertToJob.mutate({
                    job_id: job.id,
                    data: { kind: jobKindEnum.job, price },
                  })
                }
              >
                {convertToJob.isPending ? 'Converting…' : 'Accepted — convert to job'}
              </Button>
            )}
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
                {isQuote ? 'Delete quote' : 'Delete visit'}
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
            Changes apply to {job.client_name}'s visits from {formatDate(job.scheduled_date)}{' '}
            onward. Completed and individually-moved visits are kept.
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
