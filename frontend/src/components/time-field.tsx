import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

/**
 * 12-hour time picker with an am/pm toggle. Value is a 24-hour 'HH:MM'
 * string (what the API speaks), or '' for "no time".
 */
export function TimeField({
  id,
  value,
  onChange,
  clearable = true,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  clearable?: boolean
}) {
  const [h, m] = value ? value.split(':') : ['', '']
  const hours24 = value ? Number(h) : null
  const meridiem: 'am' | 'pm' = hours24 !== null && hours24 >= 12 ? 'pm' : 'am'
  const hour12 = hours24 === null ? '' : String(hours24 % 12 || 12)
  const minutes = value ? (m ?? '00') : ''

  function emit(nextHour12: string, nextMinutes: string, nextMeridiem: 'am' | 'pm') {
    if (!nextHour12) {
      onChange('')
      return
    }
    let hour = Number(nextHour12) % 12
    if (nextMeridiem === 'pm') hour += 12
    const mins = String(Math.min(59, Math.max(0, Number(nextMinutes) || 0))).padStart(2, '0')
    onChange(`${String(hour).padStart(2, '0')}:${mins}`)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={hour12} onValueChange={(v) => emit(v, minutes || '00', meridiem)}>
        <SelectTrigger id={id} className="w-18" aria-label="Hour">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hour) => (
            <SelectItem key={hour} value={String(hour)}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Input
        type="number"
        min={0}
        max={59}
        step={5}
        className="w-18"
        aria-label="Minutes"
        placeholder="00"
        disabled={!hour12}
        value={minutes}
        onChange={(e) => emit(hour12, e.target.value, meridiem)}
        onBlur={(e) => hour12 && emit(hour12, e.target.value, meridiem)}
      />
      <div className="flex overflow-hidden rounded-md border">
        {(['am', 'pm'] as const).map((mer) => (
          <button
            key={mer}
            type="button"
            disabled={!hour12}
            className={cn(
              'px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50',
              meridiem === mer && hour12
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
            onClick={() => emit(hour12 || '9', minutes || '00', mer)}
          >
            {mer}
          </button>
        ))}
      </div>
      {clearable && value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onChange('')}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
