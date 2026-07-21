import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ScrollView } from 'react-native'

import { ClientForm } from '../src/components/client-form'
import { useCreateClient } from '../src/gen'
import { CLIENTS_BASE_KEY } from '../src/lib/query-keys'

export default function NewClientScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: CLIENTS_BASE_KEY })
        router.back()
      },
    },
  })

  return (
    <ScrollView className="flex-1 bg-background px-4 py-4" contentContainerClassName="pb-10">
      <ClientForm
        submitLabel="Create client"
        pending={createClient.isPending}
        error={createClient.isError ? 'Could not create the client.' : null}
        onSubmit={(data) => createClient.mutate({ data })}
      />
    </ScrollView>
  )
}
