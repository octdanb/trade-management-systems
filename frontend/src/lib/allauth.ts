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
