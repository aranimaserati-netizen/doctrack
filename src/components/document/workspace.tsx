'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { addComment } from '@/lib/actions/comments'
import { CommentsPanel } from './comments-panel'
import { Timeline } from './timeline'
import type { Draft, Thread, TimelineEntry, VersionRow } from '@/lib/types'

const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-muted-foreground">Loading viewer…</div>,
})

export function DocumentWorkspace({
  documentId,
  versionId,
  currentVersionId,
  fileUrl,
  threads,
  timeline,
  versions,
  activeAt,
  readOnly,
}: {
  documentId: string
  versionId: string
  currentVersionId: string
  fileUrl: string
  threads: Thread[]
  timeline: TimelineEntry[]
  versions: VersionRow[]
  activeAt: string | null
  readOnly: boolean
}) {
  // Keep the first signed URL so the PDF doesn't reload (and lose scroll
  // position) every time the page data refreshes. The parent remounts this
  // component with a new key when the viewed version changes.
  const [stableUrl] = useState(fileUrl)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<'comments' | 'history'>('comments')

  async function handleSubmit(draft: Draft, body: string) {
    const res = await addComment({
      documentId,
      versionId,
      body,
      pageNumber: draft.pageNumber,
      selectedText: draft.selectedText,
      position: { rects: draft.rects },
    })
    if (res.error) {
      toast.error(res.error)
      return false
    }
    toast.success('Comment added')
    return true
  }

  function handleSelect(id: string) {
    setActiveId(id)
    document.getElementById(`hl-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Highlights only appear on the version they were made on
  const highlights = threads.filter((t) => t.version_id === versionId)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <PdfViewer
        fileUrl={stableUrl}
        comments={highlights}
        activeId={activeId}
        readOnly={readOnly}
        onSubmit={handleSubmit}
      />

      <aside className="rounded-md border lg:h-[78vh] lg:overflow-auto">
        <div className="sticky top-0 z-10 flex border-b bg-background text-sm">
          {(['comments', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2 capitalize ${
                tab === t ? 'border-b-2 border-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {t === 'history' ? 'History' : 'Comments'}
            </button>
          ))}
        </div>

        {tab === 'comments' ? (
          <CommentsPanel
            documentId={documentId}
            threads={threads}
            viewedVersionId={versionId}
            activeId={activeId}
            onSelect={handleSelect}
            readOnly={readOnly}
          />
        ) : (
          <Timeline
            entries={timeline}
            versions={versions}
            currentVersionId={currentVersionId}
            viewedVersionId={versionId}
            activeAt={activeAt}
          />
        )}
      </aside>
    </div>
  )
}