import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { View } from 'react-native'

import { UpdateBanner } from '../../src/components/update-banner'

import { useSession } from '../../src/hooks/use-auth'

export default function TabsLayout() {
  const session = useSession()

  if (!session.isLoading && !session.data) {
    return <Redirect href="/login" />
  }

  return (
    <View style={{ flex: 1 }}>
      <UpdateBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#10b981',
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="equipment"
          options={{
            title: 'Equipment',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
          }}
        />
      </Tabs>
    </View>
  )
}
