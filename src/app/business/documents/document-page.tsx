import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { DocumentWorkspace } from '/workspaces/doctrack/src/components/document/workspace'

import type { CommentRow } from '@/lib/types'

export async function DocumentPage({ id, backHref }: { id: string; backHref: string }) {
  const { supabase, profile } = await requireProfile()

  // RLS: a customer asking for another org's document gets null here
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, status, current_version_id, customer_orgs(name)')
    .eq('id', id)
    .maybeSingle()
  if (!doc || !doc.current_version_id) notFound()

  const { data: version } = await supabase
    .from('document_versions')
    .select('id, version_number, file_path, file_name, note')
    .eq('id', doc.current_version_id)
    .single()
  if (!version) notFound()

  // Short-lived link: 60 seconds
  const { data: signed } = await supabase.storage
    .from('documents')
    .createSignedUrl(version.file_path, 60)

  // Day 3 will change this to show comments across versions
  const { data: comments } = await supabase
    .from('comments')
    .select(
      'id, version_id, body, page_number, selected_text, position, resolved, created_at, author:profiles!author_id(full_name, role)'
    )
    .eq('document_id', id)
    .eq('version_id', version.id)
    .is('parent_id', null)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.role === 'business' && `${(doc.customer_orgs as any)?.name} · `}
            v{version.version_number} · {version.note}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">v{version.version_number}</Badge>
          <StatusBadge status={doc.status} />
          <a
            href={`/api/versions/${version.id}/download`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Download
          </a>
        </div>
      </div>

      {signed?.signedUrl ? (
        <DocumentWorkspace
          documentId={doc.id}
          versionId={version.id}
          fileUrl={signed.signedUrl}
          comments={(comments ?? []) as unknown as CommentRow[]}
          readOnly={doc.status === 'final'}
        />
      ) : (
        <p className="text-sm text-red-600">Could not load the file. Try refreshing.</p>
      )}
    </div>
  )
}