/**
 * Custom kubb client (see `importPath` in kubb.config.ts).
 *
 * Mirrors @kubb/plugin-client's axios client interface, but configures axios
 * for Django session auth: cookies are sent and the CSRF token cookie is
 * echoed back as the X-CSRFToken header on mutating requests.
 */
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'

export type RequestConfig<TData = unknown> = {
  baseURL?: string
  url?: string
  method?: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD'
  params?: unknown
  data?: TData | FormData
  responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream'
  signal?: AbortSignal
  validateStatus?: (status: number) => boolean
  headers?: AxiosRequestConfig['headers']
  paramsSerializer?: AxiosRequestConfig['paramsSerializer']
}

export type ResponseConfig<TData = unknown> = {
  data: TData
  status: number
  statusText: string
  headers: AxiosResponse['headers']
}

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>

export type Client = <TResponseData, _TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
) => Promise<ResponseConfig<TResponseData>>

export const axiosInstance = axios.create({
  // Same-origin: the Vite dev server (or nginx in prod) proxies /api to Django.
  baseURL: '/',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withXSRFToken: true,
})

export const client = async <TResponseData, TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
): Promise<ResponseConfig<TResponseData>> => {
  return axiosInstance
    .request<TResponseData, ResponseConfig<TResponseData>>(config)
    .catch((e: AxiosError<TError>) => {
      throw e
    })
}

export default client
