import { requireProfile } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'

export default async function Portal() {
  const { supabase } = await requireProfile()
  // No manual org filter on purpose: RLS alone must restrict this.
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My documents</h1>
      {docs?.length === 0 && <p className="text-muted-foreground">Nothing shared with you yet.</p>}
      <ul className="divide-y rounded-md border">
        {docs?.map((d) => (
          <li key={d.id} className="flex items-center justify-between p-4">
            <p className="font-medium">{d.title}</p>
            <Badge variant="secondary">{d.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}