import { Badge } from '@/components/ui/badge'

const styles: Record<string, string> = {
  uploaded: 'bg-blue-100 text-blue-800',
  in_review: 'bg-amber-100 text-amber-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  revised: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  final: 'bg-emerald-600 text-white',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`border-transparent capitalize ${styles[status] ?? ''}`}>
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}