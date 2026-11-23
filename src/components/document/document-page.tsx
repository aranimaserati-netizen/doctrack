import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'
import { LocalTime } from '@/components/local-time'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { DocumentWorkspace } from './workspace'
import { DocumentActions } from './document-actions'
import type { CommentRow, Thread, TimelineEntry, VersionRow } from '@/lib/types'
import { ArrowLeft, Download } from 'lucide-react'

export async function DocumentPage({
  id,
  backHref,
  searchParams,
}: {
  id: string
  backHref: string
  searchParams: { v?: string; at?: string }
}) {
  const { supabase, profile } = await requireProfile()

  // RLS: another org's document comes back null => 404
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, status, customer_org_id, current_version_id, final_version_id, customer_orgs(name)')
    .eq('id', id)
    .maybeSingle()
  if (!doc || !doc.current_version_id) notFound()

  const { data: versionRows } = await supabase
    .from('document_versions')
    .select(
      'id, version_number, file_path, file_name, note, created_at, restored_from_version_id, uploader:profiles!uploaded_by(full_name)'
    )
    .eq('document_id', id)
    .order('version_number', { ascending: true })
  const versions = (versionRows ?? []) as unknown as VersionRow[]

  const current = versions.find((v) => v.id === doc.current_version_id)
  if (!current) notFound()
  const viewed = versions.find((v) => v.id === searchParams.v) ?? current
  const nextAfterViewed = versions.find((v) => v.version_number === viewed.version_number + 1)
  const finalVersion = doc.final_version_id
    ? versions.find((v) => v.id === doc.final_version_id)
    : undefined

  // "As of" moment: explicit ?at=, else the moment this version was superseded, else live
  const atMs = searchParams.at ? Date.parse(searchParams.at) : NaN
  const asOfMs: number | null = !Number.isNaN(atMs)
    ? atMs
    : nextAfterViewed
      ? Date.parse(nextAfterViewed.created_at)
      : null
  const isLive = viewed.id === current.id && asOfMs === null
  const readOnly = !isLive || doc.status === 'final'
  const latestHref = `${profile.role === 'business' ? '/business' : '/portal'}/documents/${id}`

  const { data: signed } = await supabase.storage
    .from('documents')
    .createSignedUrl(viewed.file_path, 60)

  // All comments + replies, and all events (the timeline)
  const { data: commentRows } = await supabase
    .from('comments')
    .select(
      'id, version_id, parent_id, body, page_number, selected_text, position, resolved, created_at, author:profiles!author_id(full_name, role)'
    )
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  const { data: eventRows } = await supabase
    .from('events')
    .select('id, type, created_at, version_id, metadata, actor:profiles!actor_id(full_name, role)')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
  const events = (eventRows ?? []) as any[]
  // Latest status change drives the messages shown above the action buttons
const lastStatus = events.find((e) => e.type === 'status_changed')
const requestMessage: string | null =
  doc.status === 'changes_requested' && lastStatus?.metadata?.to === 'changes_requested'
    ? (lastStatus.metadata.message ?? null)
    : null
const revisedNote: string | null =
  doc.status === 'revised' && lastStatus?.metadata?.no_file_change
    ? (lastStatus.metadata.note ?? null)
    : null

  const existedThen = (iso: string) => asOfMs === null || Date.parse(iso) <= asOfMs

  // Rebuild "resolved" as it was at that moment from resolve/reopen events
  const resolvedThen = new Map<string, boolean>()
  if (asOfMs !== null) {
    for (const e of [...events].reverse()) {
      if (!existedThen(e.created_at)) continue
      if (e.type === 'comment_resolved') resolvedThen.set(e.metadata?.comment_id, true)
      if (e.type === 'comment_reopened') resolvedThen.set(e.metadata?.comment_id, false)
    }
  }

  const vNum = new Map(versions.map((v) => [v.id, v.version_number]))
  const visible = ((commentRows ?? []) as unknown as CommentRow[])
    .filter((c) => existedThen(c.created_at))
    .map((c) => ({
      ...c,
      resolved: asOfMs === null ? c.resolved : (resolvedThen.get(c.id) ?? false),
    }))

  const threads: Thread[] = visible
    .filter((c) => !c.parent_id)
    .map((c) => ({
      ...c,
      version_number: vNum.get(c.version_id) ?? 0,
      replies: visible.filter((r) => r.parent_id === c.id),
    }))

  const timeline: TimelineEntry[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    created_at: e.created_at,
    version_id: e.version_id,
    version_number: e.version_id ? (vNum.get(e.version_id) ?? null) : null,
    actor_name: e.actor?.full_name ?? 'Unknown',
    actor_role: e.actor?.role ?? null,
    metadata: e.metadata ?? {},
  }))

  return (
    <div className="space-y-4">
            <Link
             href={backHref}
             aria-label="Back to documents"
             className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#BFCBD0] bg-white/80 text-[#2F3556] shadow-[0_4px_14px_rgba(47,53,86,0.18)] transition hover:-translate-x-0.5 hover:bg-white hover:shadow-[0_6px_18px_rgba(47,53,86,0.25)]"
            >
            <ArrowLeft className="h-5 w-5" />
            </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.role === 'business' && `${(doc.customer_orgs as any)?.name} · `}
            {viewed.note}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-[#2F3556]/30 bg-white/70 px-4 py-1.5 text-sm font-bold text-[#2F3556] shadow-sm">
            Version {viewed.version_number}
          </span>
          <StatusBadge status={doc.status} />
          <a
          href={`/api/versions/${viewed.id}/download`}
          className="btn-soft inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold"
          >
          <Download className="h-4 w-4" />
          Download
          </a>
        </div>
      </div>

      {finalVersion && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900">
          <div className="flex items-center gap-3 text-sm">
            <Badge className="bg-emerald-600 text-white">Final version</Badge>
            <span>
              v{finalVersion.version_number} is the approved reference. This document is locked.
            </span>
          </div>
          <a
            href={`/api/versions/${finalVersion.id}/download`}
            className={buttonVariants({ size: 'sm' })}
          >
            Download final
          </a>
        </div>
      )}

      {!isLive && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span>
            Viewing v{viewed.version_number}
            {asOfMs !== null && (
              <>
                {', as of '}
                <LocalTime iso={new Date(asOfMs).toISOString()} />
              </>
            )}
            {' · read-only'}
          </span>
          <Link href={latestHref} className="font-medium underline">
            Back to latest
          </Link>
        </div>
      )}

      <DocumentActions
        documentId={doc.id}
        orgId={doc.customer_org_id}
        role={profile.role}
        status={doc.status}
        isLive={isLive}
        canRestore={viewed.id !== current.id}
        viewedVersionId={viewed.id}
        viewedVersionNumber={viewed.version_number}
        nextVersion={versions[versions.length - 1].version_number + 1}
        requestMessage={requestMessage}
        revisedNote={revisedNote}
      />

      {signed?.signedUrl ? (
        <DocumentWorkspace
          key={viewed.id}
          documentId={doc.id}
          versionId={viewed.id}
          currentVersionId={current.id}
          fileUrl={signed.signedUrl}
          threads={threads}
          timeline={timeline}
          versions={versions}
          activeAt={Number.isNaN(atMs) ? null : (searchParams.at ?? null)}
          readOnly={readOnly}
        />
      ) : (
        <p className="text-sm text-red-600">Could not load the file. Try refreshing.</p>
      )}
    </div>
  )
}