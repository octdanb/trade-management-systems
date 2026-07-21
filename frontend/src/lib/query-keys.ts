/**
 * Base query keys matching the kubb-generated key shapes, for invalidating
 * every cached range/filter variant of a list at once.
 */
export const JOBS_BASE_KEY = [{ url: '/api/jobs' }] as const
export const ROUTE_BASE_KEY = [{ url: '/api/route' }] as const
