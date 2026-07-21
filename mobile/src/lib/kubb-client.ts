/**
 * Custom kubb client for React Native — same interface as the web app's
 * (frontend/src/lib/kubb-client.ts) but authenticates with the Bearer
 * access token from secure storage instead of session cookies.
 */
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import { api } from './api'

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

export const client = async <TResponseData, TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
): Promise<ResponseConfig<TResponseData>> => {
  return api
    .request<TResponseData, ResponseConfig<TResponseData>>(config)
    .catch((e: AxiosError<TError>) => {
      throw e
    })
}

export default client
