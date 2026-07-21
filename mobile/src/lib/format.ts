export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function todayString(): string {
  return toDateString(new Date())
}

export function addDays(dateString: string, days: number): string {
  const d = new Date(`${dateString}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return ''
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

/** '2026-07-05' (or an ISO datetime) -> '05/7/26' */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [datePart] = iso.split('T')
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${Number(month)}/${year.slice(2)}`
}

/** '14:30' / '14:30:00' -> '2:30 pm' */
export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hours = Number(h)
  if (Number.isNaN(hours)) return time
  const meridiem = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  return `${hour12}:${m ?? '00'} ${meridiem}`
}

/** ISO datetime -> '05/7/26, 2:30 pm' */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const [, timePart] = iso.split('T')
  const date = formatDate(iso)
  return timePart ? `${date}, ${formatTime(timePart)}` : date
}

export function humanDate(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00`)
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' })
  return `${weekday} ${formatDate(dateString)}`
}
