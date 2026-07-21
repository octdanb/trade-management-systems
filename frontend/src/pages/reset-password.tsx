import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { allauthErrorMessage, requestPasswordReset, resetPassword } from '@/lib/allauth'

/** Step 1: request the reset email. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const request = useMutation({ mutationFn: requestPasswordReset })

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {request.isSuccess ? (
            <>
              <p className="text-sm">
                If an account exists for <span className="font-medium">{email}</span>, a reset
                link is on its way. Check your inbox.
              </p>
              <Button asChild variant="outline">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                request.mutate(email)
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="fp-email">Email</Label>
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {request.isError && (
                <p className="text-sm text-destructive">{allauthErrorMessage(request.error)}</p>
              )}
              <Button type="submit" disabled={request.isPending}>
                {request.isPending ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="underline underline-offset-4">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Step 2: set the new password using the key from the email link. */
export function ResetPasswordPage() {
  const { key } = useParams()
  const [password, setPassword] = useState('')
  const reset = useMutation({
    mutationFn: () => resetPassword(key ?? '', password),
  })

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {reset.isSuccess ? (
            <>
              <p className="text-sm">Your password has been reset.</p>
              <Button asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                reset.mutate()
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="rp-password">New password</Label>
                <Input
                  id="rp-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {reset.isError && (
                <p className="text-sm text-destructive">
                  {allauthErrorMessage(reset.error)} The link may have expired — request a new
                  one from the sign-in page.
                </p>
              )}
              <Button type="submit" disabled={reset.isPending}>
                {reset.isPending ? 'Saving…' : 'Set new password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
