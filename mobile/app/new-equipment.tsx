import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ScrollView } from 'react-native'

import { EquipmentForm } from '../src/components/equipment-form'
import { useCreateEquipment } from '../src/gen'
import { EQUIPMENT_BASE_KEY } from '../src/lib/query-keys'

export default function NewEquipmentScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const createEquipment = useCreateEquipment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EQUIPMENT_BASE_KEY })
        router.back()
      },
    },
  })

  return (
    <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
      <EquipmentForm
        submitLabel="Add equipment"
        pending={createEquipment.isPending}
        error={createEquipment.isError ? 'Could not add the equipment.' : null}
        onSubmit={(data) => createEquipment.mutate({ data })}
      />
    </ScrollView>
  )
}
