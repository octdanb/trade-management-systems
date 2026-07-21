/** Display formatting: dates are DD/M/YY, times are 12-hour with am/pm. */

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
