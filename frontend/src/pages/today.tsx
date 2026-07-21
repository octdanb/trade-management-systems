import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Car,
  Check,
  ExternalLink,
  MapPinOff,
  RotateCcw,
  Route,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  jobStatusEnum,
  type RouteStopOut,
  useGetRoutePlan,
  useOptimizeRoute,
  useReorderRoute,
  useUpdateJob,
} from '@/gen'
import { formatDuration, googleMapsDirectionsUrl } from '@/lib/maps'
import { JOBS_BASE_KEY, ROUTE_BASE_KEY } from '@/lib/query-keys'
import { cn } from '@/lib/utils'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function TodayPage() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayString())

  const plan = useGetRoutePlan({ date })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ROUTE_BASE_KEY })
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
  }

  const optimize = useOptimizeRoute({ mutation: { onSuccess: invalidate } })
  const reorder = useReorderRoute({ mutation: { onSuccess: invalidate } })
  const updateJob = useUpdateJob({ mutation: { onSuccess: invalidate } })

  const stops = plan.data?.stops ?? []
  const unrouted = plan.data?.unrouted ?? []
  const allJobs = [...stops, ...unrouted]
  const mapsUrl = plan.data ? googleMapsDirectionsUrl(plan.data.home ?? null, stops) : null

  const doneCount = allJobs.filter((j) => j.status === jobStatusEnum.completed).length
  const revenue = allJobs
    .filter((j) => j.status === jobStatusEnum.completed)
    .reduce((sum, j) => sum + Number(j.price), 0)

  function move(index: number, delta: number) {
    const ids = stops.map((s) => s.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate({ data: { date, job_ids: ids } })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Day plan</h1>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to today"
            onClick={() => setDate(todayString())}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => optimize.mutate({ data: { date } })}
          disabled={optimize.isPending || stops.length < 2}
        >
          <Route /> {optimize.isPending ? 'Optimizing…' : 'Optimize route'}
        </Button>
        {mapsUrl && (
          <Button variant="outline" asChild>
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <ExternalLink /> Open in Google Maps
            </a>
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {doneCount}/{allJobs.length} done
          </span>
          <span className="tabular-nums">${revenue.toFixed(2)} earned</span>
          {plan.data?.total_duration_s != null && (
            <span className="inline-flex items-center gap-1">
              <Car className="size-4" /> {formatDuration(plan.data.total_duration_s)} driving
            </span>
          )}
        </div>
      </div>

      {plan.data?.used_fallback_matrix && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Routing service was unreachable — the order is based on straight-line distance.
        </p>
      )}

      {plan.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allJobs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing scheduled for this day.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {stops.map((stop, index) => (
            <StopCard
              key={stop.id}
              stop={stop}
              position={index + 1}
              onMoveUp={index > 0 ? () => move(index, -1) : undefined}
              onMoveDown={index < stops.length - 1 ? () => move(index, 1) : undefined}
              onSetStatus={(status) => updateJob.mutate({ job_id: stop.id, data: { status } })}
              onTogglePaid={() => updateJob.mutate({ job_id: stop.id, data: { paid: !stop.paid } })}
            />
          ))}
          {unrouted.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinOff className="size-3.5" /> No location — fix the address on the client to
                include these in the route:
              </p>
              {unrouted.map((stop) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  onSetStatus={(status) => updateJob.mutate({ job_id: stop.id, data: { status } })}
                  onTogglePaid={() =>
                    updateJob.mutate({ job_id: stop.id, data: { paid: !stop.paid } })
                  }
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StopCard({
  stop,
  position,
  onMoveUp,
  onMoveDown,
  onSetStatus,
  onTogglePaid,
}: {
  stop: RouteStopOut
  position?: number
  onMoveUp?: () => void
  onMoveDown?: () => void
  onSetStatus: (status: 'scheduled' | 'completed' | 'skipped') => void
  onTogglePaid: () => void
}) {
  const done = stop.status === jobStatusEnum.completed
  const skipped = stop.status === jobStatusEnum.skipped

  return (
    <Card className={cn('py-3', (done || skipped) && 'opacity-70')}>
      <CardContent className="flex items-center gap-3 px-4">
        {position != null && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
            {position}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-medium', done && 'line-through')}>
            {stop.client_name}
            {stop.scheduled_time ? ` · ${stop.scheduled_time.slice(0, 5)}` : ''}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {stop.address || 'No address'}
            {stop.leg_duration_s != null && ` · ${formatDuration(stop.leg_duration_s)} drive`}
          </p>
          {stop.notes && <p className="truncate text-xs text-muted-foreground">{stop.notes}</p>}
        </div>
        <span className="text-sm font-medium tabular-nums">${stop.price}</span>
        <Badge
          variant={stop.paid ? 'secondary' : 'outline'}
          className="cursor-pointer select-none"
          onClick={onTogglePaid}
          role="button"
          aria-label={stop.paid ? 'Mark unpaid' : 'Mark paid'}
        >
          {stop.paid ? 'Paid' : 'Unpaid'}
        </Badge>
        {skipped && <Badge variant="outline">Skipped</Badge>}
        <div className="flex items-center gap-1">
          {onMoveUp || onMoveDown ? (
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={!onMoveUp}
                onClick={onMoveUp}
                aria-label="Move up"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={!onMoveDown}
                onClick={onMoveDown}
                aria-label="Move down"
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
          ) : null}
          {!done && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onSetStatus(skipped ? 'scheduled' : 'skipped')}
            >
              {skipped ? 'Unskip' : 'Skip'}
            </Button>
          )}
          {!skipped && (
            <Button
              variant={done ? 'secondary' : 'default'}
              size="sm"
              onClick={() => onSetStatus(done ? 'scheduled' : 'completed')}
            >
              <Check /> {done ? 'Undo' : 'Done'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
