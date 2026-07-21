/**
 * Minimal client for django-allauth's headless API (browser client).
 * Docs: https://docs.allauth.org/en/latest/headless/index.html
 */
import { isAxiosError } from 'axios'

import { axiosInstance } from '@/lib/kubb-client'

const BASE = '/_allauth/browser/v1'

export type AuthUser = {
  id: number
  display: string
  email: string
  username?: string
  has_usable_password?: boolean
}

export type EmailAddress = {
  email: string
  verified: boolean
  primary: boolean
}

export type ProviderAccount = {
  uid: string
  display: string
  provider: {
    id: string
    name: string
  }
}

type SessionResponse = {
  status: number
  data: {
    user: AuthUser
    methods: unknown[]
  }
  meta: {
    is_authenticated: boolean
  }
}

export type AllauthError = {
  message: string
  code: string
  param?: string
}

/** Returns the authenticated user, or null when there is no session. */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const res = await axiosInstance.get<SessionResponse>(`${BASE}/auth/session`)
    return res.data.data.user
  } catch (error) {
    if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 410)) {
      return null
    }
    throw error
  }
}

export async function login(payload: { email: string; password: string }) {
  await axiosInstance.post(`${BASE}/auth/login`, payload)
}

export async function signup(payload: { email: string; password: string }) {
  await axiosInstance.post(`${BASE}/auth/signup`, payload)
}

export async function logout() {
  // allauth responds 401 to a session DELETE (you are no longer
  // authenticated) — that's success, not an error.
  try {
    await axiosInstance.delete(`${BASE}/auth/session`)
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return
    throw error
  }
}

// --- Password management -----------------------------------------------------

/**
 * Change (or, for social-only accounts without one, set) the password.
 * `currentPassword` is required only when the account already has one.
 */
export async function changePassword(payload: {
  current_password?: string
  new_password: string
}) {
  await axiosInstance.post(`${BASE}/account/password/change`, payload)
}

/** Sends a password-reset email (always succeeds, even for unknown emails). */
export async function requestPasswordReset(email: string) {
  await axiosInstance.post(`${BASE}/auth/password/request`, { email })
}

/**
 * Completes a password reset with the key from the email. allauth responds
 * 401 afterwards (you're deliberately left logged out) — that's success.
 */
export async function resetPassword(key: string, password: string) {
  try {
    await axiosInstance.post(`${BASE}/auth/password/reset`, { key, password })
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return
    throw error
  }
}

// --- Email verification --------------------------------------------------------

/** Confirms an email address with the key from the verification email. */
export async function verifyEmail(key: string) {
  try {
    await axiosInstance.post(`${BASE}/auth/email/verify`, { key })
  } catch (error) {
    // 401 = verified while not logged in; the verification itself succeeded.
    if (isAxiosError(error) && error.response?.status === 401) return
    throw error
  }
}

export async function listEmailAddresses(): Promise<EmailAddress[]> {
  const res = await axiosInstance.get<{ data: EmailAddress[] }>(`${BASE}/account/email`)
  return res.data.data
}

export async function resendVerification(email: string) {
  await axiosInstance.put(`${BASE}/account/email`, { email })
}

// --- Social account connections ------------------------------------------------

export async function listProviderAccounts(): Promise<ProviderAccount[]> {
  const res = await axiosInstance.get<{ data: ProviderAccount[] }>(`${BASE}/account/providers`)
  return res.data.data
}

export async function disconnectProviderAccount(provider: string, accountUid: string) {
  await axiosInstance.delete(`${BASE}/account/providers`, {
    data: { provider, account: accountUid },
  })
}

/** Extracts a human-readable message from an allauth headless error response. */
export function allauthErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const errors = (error.response?.data as { errors?: AllauthError[] } | undefined)?.errors
    if (errors?.length) {
      return errors.map((e) => e.message).join(' ')
    }
  }
  return 'Something went wrong. Please try again.'
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

/**
 * Starts the social login "provider redirect" flow. This must be a real
 * top-level form POST (not XHR) — the response is a redirect to the
 * provider's authorization page.
 */
export function redirectToProvider(
  provider: 'google',
  callbackUrl: string = '/',
  process: 'login' | 'connect' = 'login',
) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = `${BASE}/auth/provider/redirect`

  const fields: Record<string, string> = {
    provider,
    callback_url: callbackUrl,
    process,
    csrfmiddlewaretoken: getCookie('csrftoken') ?? '',
  }
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}
