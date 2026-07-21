import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { GoogleButton } from '@/components/google-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSignup } from '@/hooks/use-auth'
import { allauthErrorMessage } from '@/lib/allauth'

export function SignupPage() {
  const navigate = useNavigate()
  const signupMutation = useSignup()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    signupMutation.mutate(
      { email, password },
      { onSuccess: () => navigate('/today', { replace: true }) },
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Start managing your trades</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleButton label="Sign up with Google" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {signupMutation.isError && (
              <p className="text-sm text-destructive">
                {allauthErrorMessage(signupMutation.error)}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
              {signupMutation.isPending ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
