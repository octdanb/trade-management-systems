import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, Field } from '../../src/components/ui'
import { useGetProfile, useUpdateProfile } from '../../src/gen'
import { useLogout, useSession } from '../../src/hooks/use-auth'
import { allauthErrorMessage, changePassword } from '../../src/lib/allauth'

export default function SettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const session = useSession()
  const logout = useLogout()

  const profile = useGetProfile()
  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [{ url: '/api/profile' }] }),
    },
  })

  const [businessName, setBusinessName] = useState('')
  const [homeAddress, setHomeAddress] = useState('')
  useEffect(() => {
    if (profile.data) {
      setBusinessName(profile.data.business_name)
      setHomeAddress(profile.data.home_address)
    }
  }, [profile.data])

  const hasPassword = session.data?.has_usable_password !== false
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const passwordChange = useMutation({
    mutationFn: () =>
      changePassword(
        hasPassword
          ? { current_password: currentPassword, new_password: newPassword }
          : { new_password: newPassword },
      ),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
    },
  })

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-4 py-3" contentContainerClassName="pb-10">
        <Text className="mb-3 text-base font-bold text-foreground">Settings</Text>

        <Card className="mb-4">
          <Text className="mb-1 font-semibold text-foreground">Business</Text>
          <Text className="mb-3 text-xs text-muted-foreground">
            Your home address is the starting point when optimizing a day's route.
          </Text>
          <Field label="Business name" value={businessName} onChangeText={setBusinessName} />
          <View className="mb-1 flex-row items-center gap-2">
            <Text className="text-sm font-medium text-foreground">Home address</Text>
            {profile.data?.home_address ? (
              profile.data.geocode_status === 'ok' ? (
                <Badge text="Located" tone="green" />
              ) : profile.data.geocode_status === 'failed' ? (
                <Badge text="Not found" tone="red" />
              ) : null
            ) : null}
          </View>
          <Field label="" value={homeAddress} onChangeText={setHomeAddress} />
          {updateProfile.isError && (
            <Text className="mb-2 text-sm text-red-600">Could not save settings.</Text>
          )}
          <Button
            title={updateProfile.isPending ? 'Saving…' : 'Save'}
            loading={updateProfile.isPending}
            onPress={() =>
              updateProfile.mutate({
                data: { business_name: businessName, home_address: homeAddress },
              })
            }
          />
        </Card>

        <Card className="mb-4">
          <Text className="mb-3 font-semibold text-foreground">
            {hasPassword ? 'Change password' : 'Set a password'}
          </Text>
          {hasPassword && (
            <Field
              label="Current password"
              value={currentPassword}
              secureTextEntry
              onChangeText={setCurrentPassword}
            />
          )}
          <Field
            label="New password"
            value={newPassword}
            secureTextEntry
            onChangeText={setNewPassword}
          />
          {passwordChange.isError && (
            <Text className="mb-2 text-sm text-red-600">
              {allauthErrorMessage(passwordChange.error)}
            </Text>
          )}
          {passwordChange.isSuccess && (
            <Text className="mb-2 text-sm text-muted-foreground">Password updated.</Text>
          )}
          <Button
            title={
              passwordChange.isPending
                ? 'Saving…'
                : hasPassword
                  ? 'Change password'
                  : 'Set password'
            }
            loading={passwordChange.isPending}
            disabled={!newPassword}
            onPress={() => passwordChange.mutate()}
          />
        </Card>

        <Card>
          <Text className="mb-1 font-semibold text-foreground">Account</Text>
          <Text className="mb-3 text-xs text-muted-foreground">{session.data?.email}</Text>
          <Button
            title="Sign out"
            variant="outline"
            onPress={() => logout.mutate(undefined, { onSuccess: () => router.replace('/login') })}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
