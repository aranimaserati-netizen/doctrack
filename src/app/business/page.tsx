import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { requireProfile } from '@/lib/auth'

export default async function Dealers() {
  const { supabase } = await requireProfile()
  const { data: orgs } = await supabase
    .from('customer_orgs')
    .select('id, name, profiles(full_name), documents(category)')
    .order('name')

  return (
    <div className="space-y-4 text-[#2F3556]">
      <h1 className="text-3xl font-bold">Dealers</h1>
      {orgs?.length === 0 && <p className="text-muted-foreground">No dealers yet.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {orgs?.map((o: any) => {
          const sales = o.documents?.filter((d: any) => d.category === 'sales').length ?? 0
          const after = o.documents?.filter((d: any) => d.category === 'after_sales').length ?? 0
          return (
            <li key={o.id}>
              <Link
                href={`/business/dealers/${o.id}`}
                className="flex items-center justify-between rounded-lg border border-[#BFCBD0] bg-white/80 p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="space-y-1">
                  <p className="text-xl font-semibold">{o.name}</p>
                  <p className="text-sm text-[#2F3556]/60">
                    {o.profiles?.map((p: any) => p.full_name).filter(Boolean).join(', ') || 'No users yet'}
                  </p>
                  {/* <p className="text-xs">
                    <span className="font-semibold text-[#3E6A8F]">{sales} sales</span>
                    {' · '}
                    <span className="font-semibold text-[#9A6B3F]">{after} after sales</span>
                  </p> */}
                </div>
                <ChevronRight className="h-6 w-6 text-[#2F3556]/50" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}