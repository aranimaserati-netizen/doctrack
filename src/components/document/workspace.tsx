'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { addComment } from '@/lib/actions/comments'
import { CommentsPanel } from './comments-panel'
import type { CommentRow, Draft } from '@/lib/types'

const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-muted-foreground">Loading viewer…</div>,
})

export function DocumentWorkspace({
  documentId,
  versionId,
  fileUrl,
  comments,
  readOnly,
}: {
  documentId: string
  versionId: string
  fileUrl: string
  comments: CommentRow[]
  readOnly?: boolean
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <PdfViewer
        fileUrl={fileUrl}
        comments={comments}
        activeId={activeId}
        readOnly={readOnly}
        onSubmit={handleSubmit}
      />
      <CommentsPanel comments={comments} activeId={activeId} onSelect={handleSelect} />
    </div>
  )
}