import { useMemo, useState } from 'react'
import type { DateClickArg } from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import { useQueryClient } from '@tanstack/react-query'

import { CreateJobDialog, EditJobDialog, EditSeriesDialog } from '@/components/job-dialog'
import { useListJobs, useUpdateJob, type JobOut } from '@/gen'
import { JOBS_BASE_KEY } from '@/lib/query-keys'

function toDateString(d: Date): string {
  // Local date, not UTC — the calendar and backend both work in local dates.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function SchedulePage() {
  const queryClient = useQueryClient()
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)

  const jobs = useListJobs(
    { start: range?.start ?? '', end: range?.end ?? '' },
    { query: { enabled: range !== null, placeholderData: (prev) => prev } },
  )

  const [createDate, setCreateDate] = useState<string | null>(null)
  const [editJob, setEditJob] = useState<JobOut | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [seriesOpen, setSeriesOpen] = useState(false)

  const updateJob = useUpdateJob({
    mutation: {
      onSettled: () => queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY }),
    },
  })

  const events = useMemo<EventInput[]>(
    () =>
      (jobs.data ?? [])
        .filter((job) => job.status !== 'cancelled')
        .map((job) => ({
          id: String(job.id),
          title: `${job.client_name} · $${job.price}`,
          start: job.scheduled_time
            ? `${job.scheduled_date}T${job.scheduled_time}`
            : job.scheduled_date,
          allDay: !job.scheduled_time,
          classNames: [`job-${job.status}`, job.paid ? 'job-paid' : ''],
          extendedProps: { job },
        })),
    [jobs.data],
  )

  function onEventDrop(info: EventDropArg) {
    const job = info.event.extendedProps.job as JobOut
    const start = info.event.start
    if (!start) {
      info.revert()
      return
    }
    updateJob.mutate(
      {
        job_id: job.id,
        data: {
          scheduled_date: toDateString(start),
          scheduled_time: info.event.allDay
            ? null
            : `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
        },
      },
      { onError: () => info.revert() },
    )
  }

  function onEventClick(info: EventClickArg) {
    setEditJob(info.event.extendedProps.job as JobOut)
    setEditOpen(true)
  }

  function onDateClick(info: DateClickArg) {
    setCreateDate(toDateString(info.date))
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Schedule</h1>
      <div className="rounded-xl border bg-card p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          height="auto"
          firstDay={1}
          editable
          dayMaxEventRows={4}
          events={events}
          datesSet={(arg) => setRange({ start: toDateString(arg.start), end: toDateString(arg.end) })}
          eventDrop={onEventDrop}
          eventClick={onEventClick}
          dateClick={onDateClick}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Click a day to add an appointment. Drag a visit to reschedule it. Click a visit to edit,
        complete or cancel it.
      </p>

      <CreateJobDialog
        date={createDate ?? ''}
        open={createDate !== null}
        onOpenChange={(open) => !open && setCreateDate(null)}
      />
      <EditJobDialog
        job={editJob}
        open={editOpen}
        onOpenChange={setEditOpen}
        onEditSeries={() => {
          setEditOpen(false)
          setSeriesOpen(true)
        }}
      />
      <EditSeriesDialog job={editJob} open={seriesOpen} onOpenChange={setSeriesOpen} />
    </div>
  )
}
