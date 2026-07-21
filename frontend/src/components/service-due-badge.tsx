import { Wrench } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

export function ServiceDueBadge({ dueOn }: { dueOn: string | null | undefined }) {
  if (!dueOn) return null
  const due = new Date(`${dueOn}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)

  if (days < 0) {
    return (
      <Badge variant="destructive">
        <Wrench /> Service overdue
      </Badge>
    )
  }
  if (days <= 7) {
    return (
      <Badge variant="secondary">
        <Wrench /> Service {days === 0 ? 'due today' : `in ${days}d`}
      </Badge>
    )
  }
  return <Badge variant="outline">Service due {dueOn}</Badge>
}
