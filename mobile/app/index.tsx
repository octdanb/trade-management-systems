import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useSession } from '../src/hooks/use-auth'

export default function Index() {
  const session = useSession()

  if (session.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    )
  }
  return <Redirect href={session.data ? '/(tabs)/today' : '/login'} />
}
