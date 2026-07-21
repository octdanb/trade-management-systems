import { useState } from 'react'
import { Text } from 'react-native'

import type { ClientIn, ClientOut } from '../gen'
import { Button, Field, SwitchRow } from './ui'

type Values = {
  name: string
  phone: string
  email: string
  address: string
  notes: string
  rate: string
  cost: string
  is_active: boolean
}

const EMPTY: Values = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  rate: '',
  cost: '',
  is_active: true,
}

export function clientToValues(client: ClientOut): Values {
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
  initial?: Values
  submitLabel: string
  pending: boolean
  error?: string | null
  onSubmit: (data: ClientIn) => void
}) {
  const [values, setValues] = useState<Values>(initial)
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  return (
    <>
      <Field label="Name" value={values.name} onChangeText={(v) => set('name', v)} />
      <Field
        label="Phone"
        value={values.phone}
        keyboardType="phone-pad"
        onChangeText={(v) => set('phone', v)}
      />
      <Field
        label="Email"
        value={values.email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(v) => set('email', v)}
      />
      <Field
        label="Address"
        value={values.address}
        placeholder="12 Example St, Suburb, Town"
        onChangeText={(v) => set('address', v)}
      />
      <Field
        label="Rate per visit ($)"
        value={values.rate}
        keyboardType="decimal-pad"
        onChangeText={(v) => set('rate', v)}
      />
      <Field
        label="Cost per visit ($)"
        value={values.cost}
        keyboardType="decimal-pad"
        onChangeText={(v) => set('cost', v)}
      />
      <Field
        label="Notes"
        value={values.notes}
        multiline
        placeholder="Gate code, dog, lawn quirks…"
        onChangeText={(v) => set('notes', v)}
      />
      <SwitchRow
        label="Active client"
        value={values.is_active}
        onChange={(v) => set('is_active', v)}
      />
      {error && <Text className="mb-2 text-sm text-red-600">{error}</Text>}
      <Button
        title={pending ? 'Saving…' : submitLabel}
        loading={pending}
        disabled={!values.name || !values.rate}
        onPress={() => onSubmit({ ...values, cost: values.cost || '0' })}
      />
    </>
  )
}
