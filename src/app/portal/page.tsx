import Link from 'next/link'
import { requireProfile } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'

export default async function Portal() {
  const { supabase } = await requireProfile()
  // No manual org filter on purpose: RLS alone restricts this.
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Commercial Policy</h1>
      {docs?.length === 0 && <p className="text-muted-foreground">Nothing shared with you yet.</p>}
      <ul className="divide-y rounded-md border">
        {docs?.map((d) => (
          <li key={d.id}>
            <Link
              href={`/portal/documents/${d.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}