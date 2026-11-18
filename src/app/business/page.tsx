import { requireProfile } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'

export default async function BusinessDashboard() {
  const { supabase } = await requireProfile()
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status, customer_orgs(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">All customer documents</h1>
      {docs?.length === 0 && <p className="text-muted-foreground">No documents yet.</p>}
      <ul className="divide-y rounded-md border">
        {docs?.map((d: any) => (
          <li key={d.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{d.title}</p>
              <p className="text-sm text-muted-foreground">{d.customer_orgs?.name}</p>
            </div>
            <Badge variant="secondary">{d.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}