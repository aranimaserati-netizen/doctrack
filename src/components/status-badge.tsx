// import { Badge } from '@/components/ui/badge'

// const styles: Record<string, string> = {
//   uploaded: 'bg-blue-100 text-blue-800',
//   in_review: 'bg-amber-100 text-amber-800',
//   changes_requested: 'bg-orange-100 text-orange-800',
//   revised: 'bg-purple-100 text-purple-800',
//   approved: 'bg-green-100 text-green-800',
//   final: 'bg-emerald-600 text-white',
// }

// export function StatusBadge({ status }: { status: string }) {
//   return (
//     <Badge variant="outline" className={`border-transparent capitalize ${styles[status] ?? ''}`}>
//       {status.replaceAll('_', ' ')}
//     </Badge>
//   )
// }

const styles: Record<string, string> = {
  uploaded: 'bg-blue-600 text-white',
  in_review: 'bg-amber-500 text-white',
  changes_requested: 'bg-orange-600 text-white',
  revised: 'bg-purple-600 text-white',
  approved: 'bg-green-600 text-white',
  final: 'bg-emerald-800 text-white',
}

// const styles: Record<string, string> = {
//   uploaded: 'bg-[#6A8FB3] text-white',
//   in_review: 'bg-[#B8956A] text-white',
//   changes_requested: 'bg-[#B9786B] text-white',
//   revised: 'bg-[#7C7AA6] text-white',
//   approved: 'bg-[#6E9A86] text-white',
//   final: 'bg-[#2F3556] text-white',
// }

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold capitalize shadow-sm ${
        styles[status] ?? 'bg-slate-600 text-white'
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-white/90" />
      {status.replaceAll('_', ' ')}
    </span>
  )
}