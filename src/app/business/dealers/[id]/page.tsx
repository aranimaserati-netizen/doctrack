import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { CATEGORY_LABEL, type Category } from '@/lib/categories'
import { CategoryBadge } from '@/components/category-badge'
import { DocCard } from '@/components/doc-card'
import { UploadPanel } from './upload-panel'

const SLOTS: Category[] = ['sales', 'after_sales']

export default async function DealerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireProfile()

  const { data: org } = await supabase.from('customer_orgs').select('id, name').eq('id', id).maybeSingle()
  if (!org) notFound()

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status, category, created_at')
    .eq('customer_org_id', id)

  return (
    <div className="space-y-6 text-[#2F3556]">
      <Link
        href="/business"
        aria-label="Back to dealers"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#BFCBD0] bg-white/80 shadow-[0_4px_14px_rgba(47,53,86,0.18)] transition hover:-translate-x-0.5 hover:bg-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-3xl font-bold">{org.name}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {SLOTS.map((cat) => {
          const doc = docs?.find((d) => d.category === cat)
          return (
            <section key={cat} className="space-y-3 rounded-lg border border-[#BFCBD0] bg-white/60 p-4">
              <CategoryBadge category={cat} />
              {doc ? (
                <DocCard
                  href={`/business/documents/${doc.id}`}
                  title={doc.title}
                  category={cat}
                  status={doc.status}
                  date={doc.created_at}
                />
              ) : (
                <UploadPanel orgId={id} orgName={org.name} category={cat} />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}