import { requireProfile } from '@/lib/auth'
import { NewDocumentForm } from './new-document-form'

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org } = await searchParams
  const { supabase } = await requireProfile()
  const { data: orgs } = await supabase.from('customer_orgs').select('id, name').order('name')

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Upload document</h1>
      <NewDocumentForm orgs={orgs ?? []} defaultOrg={org} />
    </div>
  )
}