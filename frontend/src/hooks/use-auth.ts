import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getSessionUser,
  listEmailAddresses,
  listProviderAccounts,
  login,
  logout,
  signup,
} from '@/lib/allauth'

export const SESSION_QUERY_KEY = ['auth', 'session'] as const
export const EMAILS_QUERY_KEY = ['auth', 'emails'] as const
export const PROVIDERS_QUERY_KEY = ['auth', 'providers'] as const

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSessionUser,
    staleTime: 60_000,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useSignup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: signup,
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

/** Email addresses + verification state; only fetched when signed in. */
export function useEmailAddresses(enabled = true) {
  const session = useSession()
  return useQuery({
    queryKey: EMAILS_QUERY_KEY,
    queryFn: listEmailAddresses,
    enabled: enabled && !!session.data,
    staleTime: 60_000,
  })
}

/** Connected social accounts; only fetched when signed in. */
export function useProviderAccounts(enabled = true) {
  const session = useSession()
  return useQuery({
    queryKey: PROVIDERS_QUERY_KEY,
    queryFn: listProviderAccounts,
    enabled: enabled && !!session.data,
    staleTime: 60_000,
  })
}
