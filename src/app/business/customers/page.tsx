import Link from 'next/link'
import { requireProfile } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'

export default async function CustomersPage() {
  const { supabase } = await requireProfile()
  const { data: orgs } = await supabase
    .from('customer_orgs')
    .select('id, name, documents(count), profiles(full_name, email)')
    .order('name')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <ul className="divide-y rounded-md border">
        {orgs?.map((o: any) => (
          <li key={o.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-muted-foreground">
                {o.profiles?.map((p: any) => p.full_name ?? p.email).join(', ') || 'No users yet'}
                {' · '}
                {o.documents?.[0]?.count ?? 0} documents
              </p>
            </div>
            <Link
              href={`/business/documents/new?org=${o.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              New document
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Customer organizations and user accounts are created manually in Supabase for now.
      </p>
    </div>
  )
}