/**
 * django-allauth headless client — APP flavor (/_allauth/app/v1).
 *
 * Unlike the web app (session cookies), the mobile app authenticates with
 * tokens: auth responses carry `meta.session_token` (used for further
 * allauth calls via X-Session-Token) and `meta.access_token` (used for our
 * /api/* endpoints as a Bearer token).
 */
import axios, { isAxiosError } from 'axios'

import { API_URL, clearTokens, getSessionToken, storeTokens } from './api'
import { installMock, MOCK_ENABLED } from './mock'

const allauth = axios.create({ baseURL: `${API_URL}/_allauth/app/v1` })

if (MOCK_ENABLED) installMock(allauth, 'allauth')

allauth.interceptors.request.use(async (config) => {
  const sessionToken = await getSessionToken()
  if (sessionToken) {
    config.headers['X-Session-Token'] = sessionToken
  }
  return config
})

export type AuthUser = {
  id: number
  display: string
  email: string
  username?: string
  has_usable_password?: boolean
}

type AuthResponse = {
  status: number
  data: { user: AuthUser }
  meta: { is_authenticated: boolean; session_token?: string; access_token?: string }
}

async function handleAuthResponse(res: { data: AuthResponse }): Promise<AuthUser> {
  await storeTokens({
    access: res.data.meta.access_token,
    session: res.data.meta.session_token,
  })
  return res.data.data.user
}

export async function login(payload: { email: string; password: string }) {
  return handleAuthResponse(await allauth.post<AuthResponse>('/auth/login', payload))
}

export async function signup(payload: { email: string; password: string }) {
  return handleAuthResponse(await allauth.post<AuthResponse>('/auth/signup', payload))
}

/** Returns the current user, or null when not authenticated. */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const res = await allauth.get<AuthResponse>('/auth/session')
    return res.data.data.user
  } catch (error) {
    if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 410)) {
      return null
    }
    throw error
  }
}

export async function logout() {
  try {
    await allauth.delete('/auth/session')
  } catch (error) {
    if (!(isAxiosError(error) && error.response?.status === 401)) throw error
  } finally {
    await clearTokens()
  }
}

export async function requestPasswordReset(email: string) {
  await allauth.post('/auth/password/request', { email })
}

/** Change (or set, for social-only accounts) the password. */
export async function changePassword(payload: { current_password?: string; new_password: string }) {
  await allauth.post('/account/password/change', payload)
}

export function allauthErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const errors = (error.response?.data as { errors?: { message: string }[] } | undefined)?.errors
    if (errors?.length) return errors.map((e) => e.message).join(' ')
  }
  return 'Something went wrong. Please try again.'
}
