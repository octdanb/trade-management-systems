/**
 * API client for the Django backend, authenticated with a Bearer access
 * token (see backend core/auth.py). Tokens live in expo-secure-store.
 *
 * Set the backend origin via EXPO_PUBLIC_API_URL (defaults to the local dev
 * server; use your machine's LAN IP so a device/simulator can reach it).
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

const ACCESS_TOKEN_KEY = 'mow.access_token'
const SESSION_TOKEN_KEY = 'mow.session_token'

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
}

export async function getSessionToken() {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY)
}

export async function storeTokens(tokens: { access?: string; session?: string }) {
  if (tokens.access) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access)
  if (tokens.session) await SecureStore.setItemAsync(SESSION_TOKEN_KEY, tokens.session)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY)
}

/** Axios instance for /api/* — attaches the Bearer access token. */
export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
