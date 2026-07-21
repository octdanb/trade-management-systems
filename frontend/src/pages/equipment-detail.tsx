import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, Phone, Trash2, Wrench } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EquipmentForm, equipmentToFormValues } from '@/components/equipment-form'
import { ServiceDueBadge } from '@/components/service-due-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getEquipmentQueryKey,
  listEquipmentQueryKey,
  useDeleteEquipment,
  useDeleteEquipmentPhoto,
  useDeleteServiceRecord,
  useGetEquipment,
  useLogService,
  useUpdateEquipment,
} from '@/gen'
import { axiosInstance } from '@/lib/kubb-client'

export function EquipmentDetailPage() {
  const { id } = useParams()
  const equipmentId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const equipment = useGetEquipment(equipmentId)
  const [logOpen, setLogOpen] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getEquipmentQueryKey(equipmentId) })
    queryClient.invalidateQueries({ queryKey: listEquipmentQueryKey() })
  }

  const updateEquipment = useUpdateEquipment({ mutation: { onSuccess: invalidate } })
  const deleteEquipment = useDeleteEquipment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: listEquipmentQueryKey() })
        navigate('/equipment')
      },
    },
  })
  const deletePhoto = useDeleteEquipmentPhoto({ mutation: { onSuccess: invalidate } })
  const logService = useLogService({
    mutation: {
      onSuccess: () => {
        invalidate()
        setLogOpen(false)
      },
    },
  })
  const deleteRecord = useDeleteServiceRecord({ mutation: { onSuccess: invalidate } })

  // Multipart upload goes through the shared axios instance directly — the
  // generated JSON client isn't built for FormData.
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      await axiosInstance.post(`/api/equipment/${equipmentId}/photos`, form)
    },
    onSuccess: invalidate,
  })

  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [serviceNotes, setServiceNotes] = useState('')
  const [serviceCost, setServiceCost] = useState('')

  if (equipment.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (!equipment.data) {
    return <p className="text-sm text-destructive">Equipment not found.</p>
  }
  const item = equipment.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/equipment" aria-label="Back to equipment">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 text-xl font-semibold">{item.name}</h1>
        {item.status === 'active' && <ServiceDueBadge dueOn={item.next_service_due} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
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
              {item.photos.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {item.photos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <img
                          src={photo.url}
                          alt={photo.caption || item.name}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      </a>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Delete photo"
                        onClick={() =>
                          deletePhoto.mutate({ equipment_id: equipmentId, photo_id: photo.id })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No photos yet — snap the serial plate and general condition.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Service history</CardTitle>
                <Button size="sm" onClick={() => setLogOpen(true)}>
                  <Wrench /> Log service
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(item.service_contact_name || item.service_contact_phone) && (
                <p className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-sm">
                  <Phone className="size-3.5 shrink-0" />
                  {item.service_contact_name}
                  {item.service_contact_phone && (
                    <a
                      href={`tel:${item.service_contact_phone}`}
                      className="underline underline-offset-4"
                    >
                      {item.service_contact_phone}
                    </a>
                  )}
                </p>
              )}
              {item.service_records.length ? (
                item.service_records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {record.serviced_on}
                        {record.cost != null && (
                          <span className="ml-2 text-muted-foreground">${record.cost}</span>
                        )}
                      </p>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground">{record.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete service record"
                      onClick={() =>
                        deleteRecord.mutate({ equipment_id: equipmentId, record_id: record.id })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No services logged yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentForm
              initial={equipmentToFormValues(item)}
              submitLabel="Save changes"
              pending={updateEquipment.isPending}
              error={updateEquipment.isError ? 'Could not save changes.' : null}
              onSubmit={(data) => updateEquipment.mutate({ equipment_id: equipmentId, data })}
            />
            <Button
              variant="ghost"
              className="mt-3 w-full text-destructive hover:text-destructive"
              disabled={deleteEquipment.isPending}
              onClick={() => {
                if (window.confirm('Delete this equipment, its photos and service history?')) {
                  deleteEquipment.mutate({ equipment_id: equipmentId })
                }
              }}
            >
              Delete equipment
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a service</DialogTitle>
            <DialogDescription>Resets the service-due clock for {item.name}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              logService.mutate({
                equipment_id: equipmentId,
                data: {
                  serviced_on: serviceDate,
                  notes: serviceNotes,
                  cost: serviceCost || null,
                },
              })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ls-date">Date</Label>
                <Input
                  id="ls-date"
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ls-cost">Cost ($)</Label>
                <Input
                  id="ls-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={serviceCost}
                  onChange={(e) => setServiceCost(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ls-notes">What was done</Label>
              <Textarea
                id="ls-notes"
                placeholder="Oil change, new blades…"
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
              />
            </div>
            {logService.isError && (
              <p className="text-sm text-destructive">Could not log the service.</p>
            )}
            <Button type="submit" disabled={logService.isPending}>
              {logService.isPending ? 'Saving…' : 'Log service'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
