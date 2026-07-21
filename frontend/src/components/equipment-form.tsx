import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { EquipmentIn, EquipmentOut } from '@/gen'

export type EquipmentFormValues = {
  name: string
  make_model: string
  serial_number: string
  purchase_date: string
  notes: string
  active: boolean
  service_interval_days: string
  last_serviced_on: string
  service_contact_name: string
  service_contact_phone: string
  service_contact_email: string
  service_contact_notes: string
}

const EMPTY: EquipmentFormValues = {
  name: '',
  make_model: '',
  serial_number: '',
  purchase_date: '',
  notes: '',
  active: true,
  service_interval_days: '',
  last_serviced_on: '',
  service_contact_name: '',
  service_contact_phone: '',
  service_contact_email: '',
  service_contact_notes: '',
}

export function equipmentToFormValues(item: EquipmentOut): EquipmentFormValues {
  return {
    name: item.name,
    make_model: item.make_model,
    serial_number: item.serial_number,
    purchase_date: item.purchase_date ?? '',
    notes: item.notes,
    active: item.status === 'active',
    service_interval_days: item.service_interval_days ? String(item.service_interval_days) : '',
    last_serviced_on: item.last_serviced_on ?? '',
    service_contact_name: item.service_contact_name,
    service_contact_phone: item.service_contact_phone,
    service_contact_email: item.service_contact_email,
    service_contact_notes: item.service_contact_notes,
  }
}

export function formValuesToPayload(values: EquipmentFormValues): EquipmentIn {
  return {
    name: values.name,
    make_model: values.make_model,
    serial_number: values.serial_number,
    purchase_date: values.purchase_date || null,
    notes: values.notes,
    status: values.active ? 'active' : 'retired',
    service_interval_days: values.service_interval_days
      ? Number(values.service_interval_days)
      : null,
    last_serviced_on: values.last_serviced_on || null,
    service_contact_name: values.service_contact_name,
    service_contact_phone: values.service_contact_phone,
    service_contact_email: values.service_contact_email,
    service_contact_notes: values.service_contact_notes,
  }
}

export function EquipmentForm({
  initial = EMPTY,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  initial?: EquipmentFormValues
  submitLabel: string
  pending: boolean
  error?: string | null
  onSubmit: (data: EquipmentIn) => void
}) {
  const [values, setValues] = useState<EquipmentFormValues>(initial)

  const set = <K extends keyof EquipmentFormValues>(key: K, value: EquipmentFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(formValuesToPayload(values))
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="ef-name">Name</Label>
        <Input
          id="ef-name"
          required
          placeholder="Ride-on mower"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ef-make">Make / model</Label>
          <Input
            id="ef-make"
            placeholder="Honda HRU19"
            value={values.make_model}
            onChange={(e) => set('make_model', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ef-serial">Serial number</Label>
          <Input
            id="ef-serial"
            value={values.serial_number}
            onChange={(e) => set('serial_number', e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="ef-purchased">Purchased</Label>
          <Input
            id="ef-purchased"
            type="date"
            value={values.purchase_date}
            onChange={(e) => set('purchase_date', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ef-interval">Service every (days)</Label>
          <Input
            id="ef-interval"
            type="number"
            min="1"
            placeholder="90"
            value={values.service_interval_days}
            onChange={(e) => set('service_interval_days', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ef-last">Last serviced</Label>
          <Input
            id="ef-last"
            type="date"
            value={values.last_serviced_on}
            onChange={(e) => set('last_serviced_on', e.target.value)}
          />
        </div>
      </div>
      <fieldset className="grid gap-4 rounded-lg border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          Servicing contact
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ef-cname">Name / company</Label>
            <Input
              id="ef-cname"
              placeholder="Small Engines Ltd"
              value={values.service_contact_name}
              onChange={(e) => set('service_contact_name', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ef-cphone">Phone</Label>
            <Input
              id="ef-cphone"
              type="tel"
              value={values.service_contact_phone}
              onChange={(e) => set('service_contact_phone', e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ef-cemail">Email</Label>
          <Input
            id="ef-cemail"
            type="email"
            value={values.service_contact_email}
            onChange={(e) => set('service_contact_email', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ef-cnotes">Contact notes</Label>
          <Textarea
            id="ef-cnotes"
            placeholder="Ask for Steve, books out 2 weeks ahead…"
            value={values.service_contact_notes}
            onChange={(e) => set('service_contact_notes', e.target.value)}
          />
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="ef-notes">Notes</Label>
        <Textarea
          id="ef-notes"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="ef-active" checked={values.active} onCheckedChange={(v) => set('active', v)} />
        <Label htmlFor="ef-active">In use</Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
