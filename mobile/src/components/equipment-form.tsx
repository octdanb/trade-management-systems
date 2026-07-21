import { useState } from 'react'
import { Text } from 'react-native'

import type { EquipmentIn, EquipmentOut } from '../gen'
import { Button, Field, SwitchRow } from './ui'

type Values = {
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

const EMPTY: Values = {
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

export function equipmentToValues(item: EquipmentOut): Values {
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

export function EquipmentForm({
  initial = EMPTY,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  initial?: Values
  submitLabel: string
  pending: boolean
  error?: string | null
  onSubmit: (data: EquipmentIn) => void
}) {
  const [values, setValues] = useState<Values>(initial)
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  return (
    <>
      <Field
        label="Name"
        value={values.name}
        placeholder="Ride-on mower"
        onChangeText={(v) => set('name', v)}
      />
      <Field
        label="Make / model"
        value={values.make_model}
        placeholder="Honda HRU19"
        onChangeText={(v) => set('make_model', v)}
      />
      <Field
        label="Serial number"
        value={values.serial_number}
        autoCapitalize="none"
        onChangeText={(v) => set('serial_number', v)}
      />
      <Field
        label="Purchased (YYYY-MM-DD)"
        value={values.purchase_date}
        autoCapitalize="none"
        onChangeText={(v) => set('purchase_date', v)}
      />
      <Field
        label="Service every (days)"
        value={values.service_interval_days}
        keyboardType="number-pad"
        placeholder="90"
        onChangeText={(v) => set('service_interval_days', v)}
      />
      <Field
        label="Last serviced (YYYY-MM-DD)"
        value={values.last_serviced_on}
        autoCapitalize="none"
        onChangeText={(v) => set('last_serviced_on', v)}
      />
      <Text className="mb-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">
        Servicing contact
      </Text>
      <Field
        label="Name / company"
        value={values.service_contact_name}
        placeholder="Small Engines Ltd"
        onChangeText={(v) => set('service_contact_name', v)}
      />
      <Field
        label="Phone"
        value={values.service_contact_phone}
        keyboardType="phone-pad"
        onChangeText={(v) => set('service_contact_phone', v)}
      />
      <Field
        label="Email"
        value={values.service_contact_email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(v) => set('service_contact_email', v)}
      />
      <Field
        label="Contact notes"
        value={values.service_contact_notes}
        multiline
        placeholder="Ask for Steve, books out 2 weeks ahead…"
        onChangeText={(v) => set('service_contact_notes', v)}
      />
      <Field label="Notes" value={values.notes} multiline onChangeText={(v) => set('notes', v)} />
      <SwitchRow label="In use" value={values.active} onChange={(v) => set('active', v)} />
      {error && <Text className="mb-2 text-sm text-red-600">{error}</Text>}
      <Button
        title={pending ? 'Saving…' : submitLabel}
        loading={pending}
        disabled={!values.name}
        onPress={() =>
          onSubmit({
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
          })
        }
      />
    </>
  )
}
