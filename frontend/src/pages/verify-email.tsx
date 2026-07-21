import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allauthErrorMessage, verifyEmail } from '@/lib/allauth'

export function VerifyEmailPage() {
  const { key } = useParams()
  const queryClient = useQueryClient()
  const verify = useMutation({
    mutationFn: () => verifyEmail(key ?? ''),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  // Verify as soon as the page opens from the email link.
  const { mutate } = verify
  useEffect(() => {
    if (key) mutate()
  }, [key, mutate])

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {verify.isPending && <p className="text-sm text-muted-foreground">Verifying…</p>}
          {verify.isSuccess && (
            <>
              <p className="text-sm">Your email address is verified. You're all set.</p>
              <Button asChild>
                <Link to="/">Open the app</Link>
              </Button>
            </>
          )}
          {verify.isError && (
            <>
              <p className="text-sm text-destructive">
                {allauthErrorMessage(verify.error)} The link may have expired.
              </p>
              <Button asChild variant="outline">
                <Link to="/settings">Resend from Settings</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
