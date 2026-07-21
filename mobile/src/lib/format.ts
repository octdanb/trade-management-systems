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

export function humanDate(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
