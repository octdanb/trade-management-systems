import type { LatLng, RouteStopOut } from '../gen'

/** Google Maps directions deep link (same logic as the web app). */
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
