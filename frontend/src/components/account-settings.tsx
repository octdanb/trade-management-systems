import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, MailWarning } from 'lucide-react'
import { useState } from 'react'

import { GoogleButton } from '@/components/google-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PROVIDERS_QUERY_KEY,
  SESSION_QUERY_KEY,
  useEmailAddresses,
  useProviderAccounts,
  useSession,
} from '@/hooks/use-auth'
import {
  allauthErrorMessage,
  changePassword,
  disconnectProviderAccount,
  resendVerification,
} from '@/lib/allauth'

export function EmailVerificationCard() {
  const emails = useEmailAddresses()
  const resend = useMutation({ mutationFn: resendVerification })

  const primary = emails.data?.find((e) => e.primary) ?? emails.data?.[0]
  if (!primary) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{primary.email}</span>
          {primary.verified ? (
            <Badge variant="secondary">
              <BadgeCheck /> Verified
            </Badge>
          ) : (
            <Badge variant="destructive">
              <MailWarning /> Unverified
            </Badge>
          )}
        </div>
        {!primary.verified && (
          <>
            <p className="text-xs text-muted-foreground">
              Check your inbox for the verification link. In local dev, emails are printed to the
              backend logs.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={resend.isPending || resend.isSuccess}
              onClick={() => resend.mutate(primary.email)}
            >
              {resend.isSuccess
                ? 'Sent — check your email'
                : resend.isPending
                  ? 'Sending…'
                  : 'Resend verification email'}
            </Button>
            {resend.isError && (
              <p className="text-sm text-destructive">{allauthErrorMessage(resend.error)}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ChangePasswordCard() {
  const queryClient = useQueryClient()
  const session = useSession()
  const hasPassword = session.data?.has_usable_password !== false

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')

  const change = useMutation({
    mutationFn: () =>
      changePassword(
        hasPassword ? { current_password: current, new_password: next } : { new_password: next },
      ),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? 'Change password' : 'Set a password'}</CardTitle>
        {!hasPassword && (
          <CardDescription>
            You signed up with Google. Setting a password also lets you sign in with email.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            change.mutate()
          }}
        >
          {hasPassword && (
            <div className="grid gap-2">
              <Label htmlFor="cp-current">Current password</Label>
              <Input
                id="cp-current"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="cp-new">New password</Label>
            <Input
              id="cp-new"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          {change.isError && (
            <p className="text-sm text-destructive">{allauthErrorMessage(change.error)}</p>
          )}
          {change.isSuccess && <p className="text-sm text-muted-foreground">Password updated.</p>}
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ConnectedAccountsCard() {
  const queryClient = useQueryClient()
  const providers = useProviderAccounts()

  const disconnect = useMutation({
    mutationFn: ({ provider, uid }: { provider: string; uid: string }) =>
      disconnectProviderAccount(provider, uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY }),
  })

  const google = providers.data?.find((p) => p.provider.id === 'google')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>Sign in with one tap using a linked account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {google ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Google</p>
              <p className="text-xs text-muted-foreground">{google.display}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate({ provider: 'google', uid: google.uid })}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <GoogleButton label="Connect Google" process="connect" callbackUrl="/settings" />
        )}
        {disconnect.isError && (
          <p className="text-sm text-destructive">
            {allauthErrorMessage(disconnect.error)} You may need to set a password first so you can
            still sign in.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
