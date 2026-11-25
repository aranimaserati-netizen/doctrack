import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { CATEGORY_LABEL, categoryToSlug, slugToCategory, type Category } from '@/lib/categories'
import { DocCard } from '@/components/doc-card'
import { UploadPanel } from './upload-panel'

export default async function DealerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const category = slugToCategory(tab)
  const { supabase } = await requireProfile()

  const { data: org } = await supabase.from('customer_orgs').select('id, name').eq('id', id).maybeSingle()
  if (!org) notFound()

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, status, category, created_at')
    .eq('customer_org_id', id)
    .order('created_at', { ascending: false })

  const all = docs ?? []
  const shown = all.filter((d) => d.category === category)
  const tabs: Category[] = ['sales', 'after_sales']

  return (
    <div className="space-y-5 text-[#2F3556]">
      <Link
        href="/business"
        aria-label="Back to dealers"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#BFCBD0] bg-white/80 shadow-[0_4px_14px_rgba(47,53,86,0.18)] transition hover:-translate-x-0.5 hover:bg-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-3xl font-bold">{org.name}</h1>

      <div className="flex gap-3">
        {tabs.map((t) => {
          const active = t === category
          const count = all.filter((d) => d.category === t).length
          return (
            <Link
              key={t}
              href={`/business/dealers/${id}?tab=${categoryToSlug(t)}`}
              className={`rounded-lg border px-6 py-3 text-base font-semibold transition ${
                active
                  ? 'border-[#2F3556] bg-[#2F3556] text-white shadow-md'
                  : 'border-[#BFCBD0] bg-white/70 hover:bg-white'
              }`}
            >
              {CATEGORY_LABEL[t]} <span className="ml-1 text-sm opacity-70">({count})</span>
            </Link>
          )
        })}
      </div>

      <UploadPanel orgId={id} category={category} />

      <div className="space-y-3">
        {shown.length === 0 && (
          <p className="text-sm text-[#2F3556]/60">No {CATEGORY_LABEL[category]} documents yet.</p>
        )}
        {shown.map((d) => (
          <DocCard
            key={d.id}
            href={`/business/documents/${d.id}`}
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