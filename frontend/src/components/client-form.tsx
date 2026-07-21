import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ClientIn, ClientOut } from '@/gen'

export type ClientFormValues = Required<Omit<ClientIn, 'rate' | 'cost'>> & {
  rate: string
  cost: string
}

const EMPTY: ClientFormValues = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  rate: '',
  cost: '',
  is_active: true,
}

export function clientToFormValues(client: ClientOut): ClientFormValues {
  return {
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    notes: client.notes,
    rate: String(client.rate),
    cost: String(client.cost),
    is_active: client.is_active,
  }
}

export function ClientForm({
  initial = EMPTY,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  initial?: ClientFormValues
  submitLabel: string
  pending: boolean
  error?: string | null
  onSubmit: (data: ClientIn) => void
}) {
  const [values, setValues] = useState<ClientFormValues>(initial)

  const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...values, cost: values.cost || '0' })
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="cf-name">Name</Label>
        <Input id="cf-name" required value={values.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="cf-phone">Phone</Label>
          <Input id="cf-phone" type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cf-email">Email</Label>
          <Input id="cf-email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cf-address">Address</Label>
        <Input
          id="cf-address"
          placeholder="12 Example St, Suburb, Town"
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="cf-rate">Rate per visit ($)</Label>
          <Input
            id="cf-rate"
            type="number"
            step="0.01"
            min="0"
            required
            value={values.rate}
            onChange={(e) => set('rate', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cf-cost">Cost per visit ($)</Label>
          <Input
            id="cf-cost"
            type="number"
            step="0.01"
            min="0"
            value={values.cost}
            onChange={(e) => set('cost', e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cf-notes">Notes</Label>
        <Textarea
          id="cf-notes"
          placeholder="Gate code, dog, lawn quirks…"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="cf-active" checked={values.is_active} onCheckedChange={(v) => set('is_active', v)} />
        <Label htmlFor="cf-active">Active client</Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
