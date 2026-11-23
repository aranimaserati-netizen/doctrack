import { Loader2 } from 'lucide-react'

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="text-base">{label}</p>
    </div>
  )
}