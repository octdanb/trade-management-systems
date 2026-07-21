import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSessionUser, login, logout, signup } from '../lib/allauth'

export const SESSION_QUERY_KEY = ['auth', 'session'] as const

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
  return useMutation({ mutationFn: login, onSuccess: () => queryClient.invalidateQueries() })
}

export function useSignup() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: signup, onSuccess: () => queryClient.invalidateQueries() })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: logout, onSuccess: () => queryClient.invalidateQueries() })
}
