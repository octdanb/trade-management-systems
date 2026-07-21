import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MapPin, MapPinOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getProfileQueryKey, useGetProfile, useUpdateProfile } from '@/gen'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const profile = useGetProfile()
  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getProfileQueryKey() }),
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

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Your home address is used as the starting point when optimizing a day's route.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateProfile.mutate({
                data: { business_name: businessName, home_address: homeAddress },
              })
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="st-name">Business name</Label>
              <Input id="st-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-home">Home address</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="st-home"
                  className="flex-1"
                  placeholder="12 Example St, Suburb, Town"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                />
                {profile.data?.home_address &&
                  (profile.data.geocode_status === 'ok' ? (
                    <Badge variant="secondary">
                      <MapPin /> Located
                    </Badge>
                  ) : profile.data.geocode_status === 'failed' ? (
                    <Badge variant="destructive">
                      <MapPinOff /> Not found
                    </Badge>
                  ) : null)}
              </div>
            </div>
            {updateProfile.isError && (
              <p className="text-sm text-destructive">Could not save settings.</p>
            )}
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
