import Link from 'next/link'
import { requireProfile } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'

export default async function BusinessDashboard() {
  const { supabase } = await requireProfile()
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status, created_at, customer_orgs(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Commercial Policy Documents</h1>
      {docs?.length === 0 && <p className="text-muted-foreground">No documents yet.</p>}
      <ul className="divide-y rounded-md border">
        {docs?.map((d: any) => (
          <li key={d.id}>
            <Link
              href={`/business/documents/${d.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-sm text-muted-foreground">
                  {d.customer_orgs?.name} · {new Date(d.created_at).toLocaleDateString()}
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