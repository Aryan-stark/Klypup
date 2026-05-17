import { AlertCircle } from 'lucide-react'

interface Props {
  message?: string
  retry?: () => void
}

export default function ErrorState({ message = 'Something went wrong', retry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {retry && (
        <button onClick={retry} className="text-sm text-primary underline">
          Try again
        </button>
      )}
    </div>
  )
}
