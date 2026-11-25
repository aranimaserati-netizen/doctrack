import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download, Lock } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'
import { CategoryBadge } from '@/components/category-badge'
import { categoryToSlug, type Category } from '@/lib/categories'
import { DocumentWorkspace } from './workspace'
import { DocumentActions } from './document-actions'
import type { CommentRow, Thread, TimelineEntry } from '@/lib/types'

export async function DocumentPage({ id }: { id: string }) {
  const { supabase, profile } = await requireProfile()

  // Row-level security: another dealer's document comes back null, which gives a 404
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, status, category, customer_org_id, current_version_id, customer_orgs(name)')
    .eq('id', id)
    .maybeSingle()
  if (!doc || !doc.current_version_id) notFound()

  const { data: file } = await supabase
    .from('document_versions')
    .select('id, file_path')
    .eq('id', doc.current_version_id)
    .single()
  if (!file) notFound()

  const { data: signed } = await supabase.storage.from('documents').createSignedUrl(file.file_path, 60)

  const { data: commentRows } = await supabase
    .from('comments')
    .select(
      'id, parent_id, body, page_number, selected_text, position, resolved, created_at, author:profiles!author_id(full_name, role)'
    )
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  const { data: eventRows } = await supabase
    .from('events')
    .select('id, type, created_at, metadata, actor:profiles!actor_id(full_name)')
    .eq('document_id', id)
    .order('created_at', { ascending: false })

  const all = (commentRows ?? []) as unknown as CommentRow[]
  const threads: Thread[] = all
    .filter((c) => !c.parent_id)
    .map((c) => ({ ...c, replies: all.filter((r) => r.parent_id === c.id) }))

  const timeline: TimelineEntry[] = ((eventRows ?? []) as any[]).map((e) => ({
    id: e.id,
    type: e.type,
    created_at: e.created_at,
    actor_name: e.actor?.full_name ?? 'Unknown',
    metadata: e.metadata ?? {},
  }))

  const category = doc.category as Category
  const isBusiness = profile.role === 'business'
  const backHref = isBusiness
    ? `/business/dealers/${doc.customer_org_id}?tab=${categoryToSlug(category)}`
    : '/portal'

  return (
    <div className="space-y-4 text-[#2F3556]">
      <Link
        href={backHref}
        aria-label="Back"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#BFCBD0] bg-white/80 shadow-[0_4px_14px_rgba(47,53,86,0.18)] transition hover:-translate-x-0.5 hover:bg-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <CategoryBadge category={category} />
          <h1 className="text-3xl font-bold">{doc.title}</h1>
          {isBusiness && <p className="text-sm text-[#2F3556]/60">{(doc.customer_orgs as any)?.name}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={doc.status} />
          <a
            href={`/api/versions/${file.id}/download`}
            className="btn-soft inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>

      {doc.status === 'final' && (
        <div className="flex items-center gap-3 rounded-md border border-[#C5E0A8] bg-[#EAF5DD] px-4 py-3 text-sm text-[#3F6A25]">
          <Lock className="h-4 w-4" />
          This is the final version. The document is locked.
        </div>
      )}

      <DocumentActions documentId={doc.id} role={profile.role} status={doc.status} />

      {signed?.signedUrl ? (
        <DocumentWorkspace
          documentId={doc.id}
          versionId={file.id}
          fileUrl={signed.signedUrl}
          threads={threads}
          timeline={timeline}
          readOnly={doc.status === 'final'}
        />
      ) : (
        <p className="text-sm text-red-600">Could not load the file. Try refreshing.</p>
      )}
    </div>
  )
}