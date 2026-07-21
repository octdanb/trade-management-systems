import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarPlus,
  Camera,
  Mail,
  MapPin,
  MapPinOff,
  Pencil,
  Phone,
  Trash2,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  type ClientOut,
  getClientQueryKey,
  listClientsQueryKey,
  listSeriesQueryKey,
  useCreateClientNote,
  useCreateSeries,
  useDeleteClient,
  useDeleteClientNote,
  useDeleteClientPhoto,
  useEndSeries,
  useGetClient,
  useListSeries,
  useUpdateClient,
} from '@/gen'
import { formatDate, formatDateTime, formatTime } from '@/lib/format'
import { axiosInstance } from '@/lib/kubb-client'
import { googleMapsSearchUrl } from '@/lib/maps'
import { JOBS_BASE_KEY } from '@/lib/query-keys'

export function ClientDetailPage() {
  const { id } = useParams()
  const clientId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const client = useGetClient(clientId)
  const series = useListSeries({ client_id: clientId })
  const [editing, setEditing] = useState(false)
  const [addSeriesOpen, setAddSeriesOpen] = useState(false)

  const invalidateClient = () => {
    queryClient.invalidateQueries({ queryKey: getClientQueryKey(clientId) })
    queryClient.invalidateQueries({ queryKey: listClientsQueryKey() })
  }
  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: listSeriesQueryKey() })
    queryClient.invalidateQueries({ queryKey: JOBS_BASE_KEY })
  }

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        invalidateClient()
        setEditing(false)
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
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Details</CardTitle>
                <Button
                  size="sm"
                  variant={editing ? 'ghost' : 'outline'}
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? (
                    <>
                      <X /> Cancel
                    </>
                  ) : (
                    <>
                      <Pencil /> Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <>
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
                </>
              ) : (
                <ClientDetails client={client.data} />
              )}
            </CardContent>
          </Card>

          <ClientNotesCard client={client.data} onChanged={invalidateClient} />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
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
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{FREQUENCY_LABELS[s.frequency]}</p>
                      <p className="text-xs text-muted-foreground">
                        From {formatDate(s.start_date)}
                        {s.default_time ? ` at ${formatTime(s.default_time)}` : ''}
                        {s.end_date ? ` — ends ${formatDate(s.end_date)}` : ''}
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
                  No recurring appointments. Add one, or create one-off visits and quotes from the
                  Schedule.
                </p>
              )}
            </CardContent>
          </Card>

          <ClientPhotosCard client={client.data} onChanged={invalidateClient} />
        </div>
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

/** Read-only client details; contact fields open the matching app. */
function ClientDetails({ client }: { client: ClientOut }) {
  return (
    <dl className="grid gap-3 text-sm">
      <DetailRow label="Phone">
        {client.phone ? (
          <a
            href={`tel:${client.phone}`}
            className="inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <Phone className="size-3.5" /> {client.phone}
          </a>
        ) : (
          <Empty />
        )}
      </DetailRow>
      <DetailRow label="Email">
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <Mail className="size-3.5" /> {client.email}
          </a>
        ) : (
          <Empty />
        )}
      </DetailRow>
      <DetailRow label="Address">
        {client.address ? (
          <a
            href={googleMapsSearchUrl(client.address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <MapPin className="size-3.5" /> {client.address}
          </a>
        ) : (
          <Empty />
        )}
      </DetailRow>
      <DetailRow label="Rate per visit">${client.rate}</DetailRow>
      <DetailRow label="Cost per visit">${client.cost}</DetailRow>
      <DetailRow label="Status">
        <Badge variant={client.is_active ? 'secondary' : 'outline'}>
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </DetailRow>
      {client.notes && (
        <DetailRow label="General notes">
          <span className="whitespace-pre-wrap">{client.notes}</span>
        </DetailRow>
      )}
    </dl>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function Empty() {
  return <span className="text-muted-foreground">—</span>
}

/** Dated note log for a client. */
function ClientNotesCard({ client, onChanged }: { client: ClientOut; onChanged: () => void }) {
  const [body, setBody] = useState('')

  const createNote = useCreateClientNote({
    mutation: {
      onSuccess: () => {
        setBody('')
        onChanged()
      },
    },
  })
  const deleteNote = useDeleteClientNote({ mutation: { onSuccess: onChanged } })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (body.trim()) createNote.mutate({ client_id: client.id, data: { body } })
          }}
        >
          <Textarea
            placeholder="Add a note — gate code changed, quoted the hedge, dog now friendly…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {createNote.isError && (
            <p className="text-sm text-destructive">Could not add the note.</p>
          )}
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={createNote.isPending || !body.trim()}
          >
            {createNote.isPending ? 'Adding…' : 'Add note'}
          </Button>
        </form>
        {client.note_entries.length ? (
          client.note_entries.map((note) => (
            <div
              key={note.id}
              className="flex items-start justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                <p className="whitespace-pre-wrap text-sm">{note.body}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Delete note"
                onClick={() => deleteNote.mutate({ client_id: client.id, note_id: note.id })}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

/** Photo gallery for a client (lawn, access, before/after…). */
function ClientPhotosCard({ client, onChanged }: { client: ClientOut; onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)

  // Multipart upload goes through the shared axios instance directly — the
  // generated JSON client isn't built for FormData.
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      await axiosInstance.post(`/api/clients/${client.id}/photos`, form)
    },
    onSuccess: onChanged,
  })
  const deletePhoto = useDeleteClientPhoto({ mutation: { onSuccess: onChanged } })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Photos</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={uploadPhoto.isPending}
            onClick={() => fileInput.current?.click()}
          >
            <Camera /> {uploadPhoto.isPending ? 'Uploading…' : 'Add photo'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
          <p className="mb-2 text-sm text-destructive">Upload failed. Try again.</p>
        )}
        {client.photos.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {client.photos.map((photo) => (
              <div key={photo.id} className="group relative">
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img
                    src={photo.url}
                    alt={photo.caption || client.name}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </a>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete photo"
                  onClick={() => deletePhoto.mutate({ client_id: client.id, photo_id: photo.id })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No photos yet — lawn, access, before &amp; after shots.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
