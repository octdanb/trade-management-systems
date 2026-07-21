import { useQueryClient } from '@tanstack/react-query'
import { MapPinOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ClientForm } from '@/components/client-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listClientsQueryKey, useCreateClient, useListClients } from '@/gen'

export function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const clients = useListClients({ search: search || undefined })
  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: listClientsQueryKey() })
        setCreateOpen(false)
      },
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Clients</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search name, address, phone…"
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> New client
          </Button>
        </div>
      </div>

      {clients.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : clients.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.data.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link to={`/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell>{client.phone || '—'}</TableCell>
                <TableCell className="max-w-64 truncate">
                  <span className="inline-flex items-center gap-1">
                    {client.address || '—'}
                    {client.address && client.geocode_status === 'failed' && (
                      <MapPinOff
                        className="size-3.5 text-destructive"
                        aria-label="Geocoding failed"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">${client.rate}</TableCell>
                <TableCell className="text-right tabular-nums">${client.cost}</TableCell>
                <TableCell>
                  {client.is_active ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {search ? 'No clients match your search.' : 'No clients yet — add your first one.'}
        </p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>Contact details, address and pricing</DialogDescription>
          </DialogHeader>
          <ClientForm
            submitLabel="Create client"
            pending={createClient.isPending}
            error={
              createClient.isError
                ? 'Could not create the client. Check the fields and try again.'
                : null
            }
            onSubmit={(data) => createClient.mutate({ data })}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
