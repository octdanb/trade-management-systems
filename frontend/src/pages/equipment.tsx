import { useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EquipmentForm } from '@/components/equipment-form'
import { ServiceDueBadge } from '@/components/service-due-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listEquipmentQueryKey, useCreateEquipment, useListEquipment } from '@/gen'

export function EquipmentPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const equipment = useListEquipment()

  const createEquipment = useCreateEquipment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: listEquipmentQueryKey() })
        setCreateOpen(false)
      },
    },
  })

  const active = equipment.data?.filter((e) => e.status === 'active') ?? []
  const retired = equipment.data?.filter((e) => e.status === 'retired') ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Tools & equipment</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Add equipment
        </Button>
      </div>

      {equipment.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : equipment.data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...active, ...retired].map((item) => (
            <Link key={item.id} to={`/equipment/${item.id}`}>
              <Card className="h-full py-0 transition-colors hover:bg-accent/50">
                {item.photos[0] ? (
                  <img
                    src={item.photos[0].url}
                    alt={item.name}
                    className="h-36 w-full rounded-t-xl object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center rounded-t-xl bg-muted">
                    <Wrench className="size-8 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.make_model && (
                        <p className="text-xs text-muted-foreground">{item.make_model}</p>
                      )}
                    </div>
                    {item.status === 'retired' && <Badge variant="outline">Retired</Badge>}
                  </div>
                  {item.status === 'active' && <ServiceDueBadge dueOn={item.next_service_due} />}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No equipment yet. Add the mower, trimmer, trailer — anything you want to track servicing
          and photos for.
        </p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add equipment</DialogTitle>
            <DialogDescription>Details, service cadence and servicing contact</DialogDescription>
          </DialogHeader>
          <EquipmentForm
            submitLabel="Add equipment"
            pending={createEquipment.isPending}
            error={createEquipment.isError ? 'Could not add the equipment.' : null}
            onSubmit={(data) => createEquipment.mutate({ data })}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
