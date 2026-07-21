import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, MapPin, MapPinOff } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ClientForm, clientToFormValues } from '@/components/client-form'
import { FREQUENCY_LABELS, SeriesForm } from '@/components/series-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JOBS_BASE_KEY } from '@/lib/query-keys'
import {
  getClientQueryKey,
  listClientsQueryKey,
  listSeriesQueryKey,
  useCreateSeries,
  useDeleteClient,
  useEndSeries,
  useGetClient,
  useListSeries,
  useUpdateClient,
} from '@/gen'

export function ClientDetailPage() {
  const { id } = useParams()
  const clientId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const client = useGetClient(clientId)
  const series = useListSeries({ client_id: clientId })
  const [addSeriesOpen, setAddSeriesOpen] = useState(false)

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: listSeriesQueryKey() })
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
  }

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getClientQueryKey(clientId) })
        queryClient.invalidateQueries({ queryKey: listClientsQueryKey() })
      },
    },
  })
  const deleteClient = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries()
        navigate('/clients')
      },
    },
  })
  const createSeries = useCreateSeries({
    mutation: {
      onSuccess: () => {
        invalidateSchedule()
        setAddSeriesOpen(false)
      },
    },
  })
  const endSeries = useEndSeries({
    mutation: { onSuccess: invalidateSchedule },
  })

  if (client.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (!client.data) {
    return <p className="text-sm text-destructive">Client not found.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients" aria-label="Back to clients">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 text-xl font-semibold">{client.data.name}</h1>
        {client.data.address &&
          (client.data.geocode_status === 'ok' ? (
            <Badge variant="secondary">
              <MapPin /> Located
            </Badge>
          ) : client.data.geocode_status === 'failed' ? (
            <Badge variant="destructive">
              <MapPinOff /> Address not found
            </Badge>
          ) : (
            <Badge variant="outline">Not geocoded yet</Badge>
          ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm
              initial={clientToFormValues(client.data)}
              submitLabel="Save changes"
              pending={updateClient.isPending}
              error={updateClient.isError ? 'Could not save changes.' : null}
              onSubmit={(data) => updateClient.mutate({ client_id: clientId, data })}
            />
            <Button
              variant="ghost"
              className="mt-3 w-full text-destructive hover:text-destructive"
              disabled={deleteClient.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'Delete this client and ALL their appointments and history? Usually marking them inactive is better.',
                  )
                ) {
                  deleteClient.mutate({ client_id: clientId })
                }
              }}
            >
              Delete client
            </Button>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recurring appointments</CardTitle>
              <Button size="sm" onClick={() => setAddSeriesOpen(true)}>
                <CalendarPlus /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {series.data?.length ? (
              series.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{FREQUENCY_LABELS[s.frequency]}</p>
                    <p className="text-xs text-muted-foreground">
                      From {s.start_date}
                      {s.default_time ? ` at ${s.default_time.slice(0, 5)}` : ''}
                      {s.end_date ? ` — ends ${s.end_date}` : ''}
                    </p>
                  </div>
                  {!s.end_date && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={endSeries.isPending}
                      onClick={() => {
                        if (window.confirm('Stop this recurring appointment from today?')) {
                          endSeries.mutate({
                            series_id: s.id,
                            data: { end_date: new Date().toISOString().slice(0, 10) },
                          })
                        }
                      }}
                    >
                      End
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recurring appointments. Add one, or create one-off visits from the Schedule.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addSeriesOpen} onOpenChange={setAddSeriesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New recurring appointment</DialogTitle>
            <DialogDescription>for {client.data.name}</DialogDescription>
          </DialogHeader>
          <SeriesForm
            submitLabel="Create"
            pending={createSeries.isPending}
            error={createSeries.isError ? 'Could not create the series.' : null}
            onSubmit={(v) =>
              createSeries.mutate({
                data: {
                  client_id: clientId,
                  frequency: v.frequency,
                  start_date: v.start_date,
                  default_time: v.default_time || null,
                  duration_minutes: Number(v.duration_minutes) || 60,
                },
              })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
