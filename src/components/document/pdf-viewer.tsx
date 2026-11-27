'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/loading-button'
import { Textarea } from '@/components/ui/textarea'
import type { CommentRow, Draft, Rect } from '@/lib/types'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

type Props = {
  fileUrl: string
  comments: CommentRow[]
  activeId: string | null
  readOnly?: boolean
  onSubmit: (draft: Draft, body: string) => Promise<boolean>
}

// Drop rectangles that sit fully inside another one
const EPS = 0.05
const contains = (b: Rect, a: Rect) =>
  b.x <= a.x + EPS && b.y <= a.y + EPS && b.x + b.w >= a.x + a.w - EPS && b.y + b.h >= a.y + a.h - EPS
const dedupe = (rects: Rect[]) =>
  rects.filter((a, i) => !rects.some((b, j) => j !== i && contains(b, a) && (!contains(a, b) || j < i)))

export default function PdfViewer({ fileUrl, comments, activeId, readOnly, onSubmit }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [width, setWidth] = useState(720)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fit the page width to the container
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.max(300, Math.min(900, el.clientWidth - 32))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleMouseUp = useCallback(() => {
    if (readOnly) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
    const text = sel.toString().trim()
    const content = contentRef.current
    if (!text || !content) return

    const range = sel.getRangeAt(0)
    if (!content.contains(range.commonAncestorContainer)) return

    const pageOf = (node: Node) =>
      (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-pdf-page]') ?? null
    const startPage = pageOf(range.startContainer)
    const endPage = pageOf(range.endContainer)
    if (!startPage || startPage !== endPage) {
      toast.error('Please select text within a single page.')
      return
    }

    const pageRect = startPage.getBoundingClientRect()
    const raw: Rect[] = Array.from(range.getClientRects())
      .filter((r) => r.width > 2 && r.height > 2)
      .filter(
        (r) =>
          r.left >= pageRect.left - 1 &&
          r.right <= pageRect.right + 1 &&
          r.top >= pageRect.top - 1 &&
          r.bottom <= pageRect.bottom + 1
      )
      .map((r) => ({
        x: ((r.left - pageRect.left) / pageRect.width) * 100,
        y: ((r.top - pageRect.top) / pageRect.height) * 100,
        w: (r.width / pageRect.width) * 100,
        h: (r.height / pageRect.height) * 100,
      }))
    const rects = dedupe(raw)
    if (rects.length === 0) return

    const contentRect = content.getBoundingClientRect()
    const last = range.getBoundingClientRect()
    setDraft({
      pageNumber: Number(startPage.dataset.pdfPage),
      selectedText: text.slice(0, 1000),
      rects,
      anchor: {
        left: Math.min(Math.max(8, last.left - contentRect.left), Math.max(8, contentRect.width - 300)),
        top: last.bottom - contentRect.top + 8,
      },
    })
    setBody('')
  }, [readOnly])

  async function submit() {
    if (!draft || !body.trim()) return
    setSaving(true)
    const ok = await onSubmit(draft, body.trim())
    setSaving(false)
    if (ok) {
      setDraft(null)
      setBody('')
      window.getSelection()?.removeAllRanges()
    }
  }

  return (
    <div ref={scrollRef} className="h-[78vh] overflow-auto rounded-md border border-[#BFCBD0] bg-[#EEF1F4]">
      <div ref={contentRef} className="relative p-4">
        <div onMouseUp={handleMouseUp} onMouseDown={() => setDraft(null)}>
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p className="p-8 text-sm text-muted-foreground">Loading document…</p>}
            error={
              <p className="p-8 text-sm text-red-600">
                Could not load the PDF. The secure link may have expired, so refresh the page.
              </p>
            }
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <div key={n} data-pdf-page={n} className="relative mx-auto mb-4 w-fit bg-white shadow">
                <Page pageNumber={n} width={width} renderAnnotationLayer={false} />

                {/* Highlights: pointer-events-none so text stays selectable */}
                <div className="pointer-events-none absolute inset-0">
                  {comments
                    .filter((c) => c.page_number === n && c.position?.rects?.length)
                    .map((c) => (
                      <div
                        key={c.id}
                        className={`absolute inset-0 transition-opacity ${activeId === c.id ? 'opacity-70' : 'opacity-30'}`}
                      >
                        {c.position!.rects.map((r, i) => (
                          <div
                            key={i}
                            id={i === 0 ? `hl-${c.id}` : undefined}
                            className={`absolute ${c.resolved ? 'bg-[#8CC063]' : 'bg-[#FACC15]'}`}
                            style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
                          />
                        ))}
                      </div>
                    ))}

                  {draft?.pageNumber === n && (
                    <div className="absolute inset-0 opacity-30">
                      {draft.rects.map((r, i) => (
                        <div
                          key={i}
                          className="absolute bg-blue-500"
                          style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Document>
        </div>

        {draft && (
          <div
            className="absolute z-20 w-72 rounded-md border bg-background p-3 shadow-lg"
            style={{ left: draft.anchor.left, top: draft.anchor.top }}
          >
            <p className="mb-2 line-clamp-2 border-l-2 pl-2 text-xs italic text-muted-foreground">“{draft.selectedText}”</p>
            <Textarea
              autoFocus
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                className="bg-[#2F3556] hover:bg-[#3a4166]"
                loading={saving}
                disabled={!body.trim()}
                onClick={submit}
              >
                {saving ? 'Saving…' : 'Comment'}
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}