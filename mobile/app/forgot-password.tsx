import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, Text } from 'react-native'

import { Button, Field } from '../src/components/ui'
import { allauthErrorMessage, requestPasswordReset } from '../src/lib/allauth'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const request = useMutation({ mutationFn: requestPasswordReset })

  return (
    <ScrollView className="flex-1 bg-background px-4 py-4">
      {request.isSuccess ? (
        <Text className="text-sm text-foreground">
          If an account exists for {email}, a reset link is on its way. Open it on this phone or any
          browser to set a new password, then sign in here.
        </Text>
      ) : (
        <>
          <Text className="mb-4 text-sm text-muted-foreground">
            Enter your email and we'll send you a link to set a new password.
          </Text>
          <Field
            label="Email"
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
          />
          {request.isError && (
            <Text className="mb-2 text-sm text-red-600">{allauthErrorMessage(request.error)}</Text>
          )}
          <Button
            title={request.isPending ? 'Sending…' : 'Send reset link'}
            loading={request.isPending}
            disabled={!email}
            onPress={() => request.mutate(email)}
          />
        </>
      )}
    </ScrollView>
  )
}
