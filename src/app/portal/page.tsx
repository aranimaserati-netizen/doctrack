import { requireProfile } from '@/lib/auth'
import { DocCard } from '@/components/doc-card'
import type { Category } from '@/lib/categories'

export default async function Portal() {
  const { supabase } = await requireProfile()
  // No manual dealer filter on purpose: row-level security restricts this
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status, category, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4 text-[#2F3556]">
      <h1 className="text-3xl font-bold">My documents</h1>
      {docs?.length === 0 && <p className="text-muted-foreground">Nothing shared with you yet.</p>}
      <div className="space-y-3">
        {docs?.map((d) => (
          <DocCard
            key={d.id}
            href={`/portal/documents/${d.id}`}
            title={d.title}
            category={d.category as Category}
            status={d.status}
            date={d.created_at}
          />
        ))}
      </div>
    </div>
  )
}