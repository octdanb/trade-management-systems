import type { LatLng, RouteStopOut } from '@/gen'

/**
 * Google Maps directions deep link for turn-by-turn navigation.
 * The URL API allows ~9 waypoints; when over the cap we keep the first ones
 * (destination stays the final stop).
 */
export function googleMapsDirectionsUrl(home: LatLng | null, stops: RouteStopOut[]): string | null {
  const located = stops.filter((s) => s.lat != null && s.lng != null)
  if (located.length === 0) return null

  const coord = (lat: number, lng: number) => `${lat},${lng}`
  const destination = located[located.length - 1]
  const waypoints = located.slice(0, -1).slice(0, 9)

  const params = new URLSearchParams({
    api: '1',
    destination: coord(destination.lat!, destination.lng!),
    travelmode: 'driving',
  })
  if (home) params.set('origin', coord(home.lat, home.lng))
  if (waypoints.length) {
    params.set('waypoints', waypoints.map((s) => coord(s.lat!, s.lng!)).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Google Maps search link for a plain address (opens the maps app on mobile). */
export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return ''
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
