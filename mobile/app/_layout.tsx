import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import '../global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="new-appointment"
          options={{ title: 'New appointment', presentation: 'modal' }}
        />
        <Stack.Screen name="new-client" options={{ title: 'New client', presentation: 'modal' }} />
        <Stack.Screen
          name="new-equipment"
          options={{ title: 'Add equipment', presentation: 'modal' }}
        />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}
