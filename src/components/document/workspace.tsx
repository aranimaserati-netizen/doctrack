'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addComment } from '@/lib/actions/comments'
import { CommentsPanel } from './comments-panel'
import { Timeline } from './timeline'
import { CommentTip } from './comment-tip'
import type { Draft, Thread, TimelineEntry } from '@/lib/types'

const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-muted-foreground">Loading viewer…</div>,
})

export function DocumentWorkspace({
  documentId,
  versionId,
  fileUrl,
  threads,
  timeline,
  readOnly,
}: {
  documentId: string
  versionId: string
  fileUrl: string
  threads: Thread[]
  timeline: TimelineEntry[]
  readOnly: boolean
}) {
  const router = useRouter()
  // Keep the first signed URL so the PDF does not reload after every comment
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
    router.refresh()
    return true
  }

  function handleSelect(id: string) {
    setActiveId(id)
    document.getElementById(`hl-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative min-w-0">
        <PdfViewer
          fileUrl={stableUrl}
          comments={threads}
          activeId={activeId}
          readOnly={readOnly}
          onSubmit={handleSubmit}
        />
        {!readOnly && <CommentTip />}
      </div>

      <aside className="rounded-md border border-[#BFCBD0] bg-white/80 lg:h-[78vh] lg:overflow-auto">
        <div className="sticky top-0 z-10 flex border-b border-[#BFCBD0] bg-white text-sm">
          {(['comments', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2 capitalize ${
                tab === t ? 'border-b-2 border-[#2F3556] font-semibold' : 'text-[#2F3556]/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'comments' ? (
          <CommentsPanel
            documentId={documentId}
            threads={threads}
            activeId={activeId}
            onSelect={handleSelect}
            readOnly={readOnly}
          />
        ) : (
          <Timeline entries={timeline} />
        )}
      </aside>
    </div>
  )
}