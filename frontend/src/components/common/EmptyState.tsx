import { Inbox } from 'lucide-react'

interface Props {
  message?: string
}

export default function EmptyState({ message = 'No data found' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
