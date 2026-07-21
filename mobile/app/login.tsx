import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLogin, useSignup } from '../src/hooks/use-auth'
import { allauthErrorMessage } from '../src/lib/allauth'

export default function LoginScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useLogin()
  const signupMutation = useSignup()
  const active = mode === 'login' ? loginMutation : signupMutation

  function submit() {
    active.mutate({ email, password }, { onSuccess: () => router.replace('/(tabs)/today') })
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-1 text-3xl font-bold text-foreground">🌱 Mow</Text>
        <Text className="mb-8 text-muted-foreground">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>

        <Text className="mb-1 text-sm font-medium text-foreground">Email</Text>
        <TextInput
          className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text className="mb-1 text-sm font-medium text-foreground">Password</Text>
        <TextInput
          className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
        />

        {active.isError && (
          <Text className="mb-3 text-sm text-red-600">{allauthErrorMessage(active.error)}</Text>
        )}

        <Pressable
          className="items-center rounded-xl bg-primary py-3.5 active:opacity-80"
          disabled={active.isPending}
          onPress={submit}
        >
          <Text className="font-semibold text-primary-foreground">
            {active.isPending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </Text>
        </Pressable>

        <Pressable
          className="mt-3 items-center py-1"
          onPress={() => router.push('/forgot-password')}
        >
          <Text className="text-sm text-muted-foreground">Forgot password?</Text>
        </Pressable>
        <Pressable
          className="mt-1 items-center py-2"
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          <Text className="text-sm text-muted-foreground">
            {mode === 'login' ? 'No account? Sign up' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
