'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { replyToComment, setCommentResolved } from '@/lib/actions/review'
import type { CommentRow, Thread } from '@/lib/types'

function Author({ c }: { c: CommentRow }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-sm font-medium">{c.author?.full_name ?? 'Unknown'}</span>
      {c.author && (
        <Badge variant="secondary" className="text-[10px] capitalize">
          {c.author.role}
        </Badge>
      )}
      <time className="ml-auto text-xs text-muted-foreground" suppressHydrationWarning>
        {new Date(c.created_at).toLocaleString([], {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </time>
    </div>
  )
}

function ReplyBox({ documentId, parentId }: { documentId: string; parentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    const res = await replyToComment({ documentId, parentId, body })
    setBusy(false)
    if (res.error) return toast.error(res.error)
    setBody('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Reply
      </Button>
    )
  }
  return (
    <div className="mt-2 space-y-2">
      <Textarea
        autoFocus
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" disabled={!body.trim() || busy} onClick={send}>
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}

export function CommentsPanel({
  documentId,
  threads,
  viewedVersionId,
  activeId,
  onSelect,
  readOnly,
}: {
  documentId: string
  threads: Thread[]
  viewedVersionId: string
  activeId: string | null
  onSelect: (id: string) => void
  readOnly: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [hideResolved, setHideResolved] = useState(false)

  async function toggleResolved(t: Thread) {
    const res = await setCommentResolved(documentId, t.id, !t.resolved)
    if (res.error) return toast.error(res.error)
    router.refresh()
  }

  const shown = hideResolved ? threads.filter((t) => !t.resolved) : threads
  const openCount = threads.filter((t) => !t.resolved).length

  return (
    <div>
      <div className="flex items-center justify-between border-b p-3 text-sm">
        <span className="font-medium">
          Comments ({threads.length}) · {openCount} open
        </span>
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setHideResolved((v) => !v)}
        >
          {hideResolved ? 'Show resolved' : 'Hide resolved'}
        </button>
      </div>

      {shown.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">
          {readOnly
            ? 'No comments at this point in time.'
            : 'Select text in the document to add the first comment.'}
        </p>
      )}

      <ul className="divide-y">
        {shown.map((t) => (
          <li
            key={t.id}
            className={`p-3 ${activeId === t.id ? 'bg-yellow-50 dark:bg-yellow-950/30' : ''} ${
              t.resolved ? 'opacity-60' : ''
            }`}
          >
            <button type="button" onClick={() => onSelect(t.id)} className="block w-full text-left">
              <Author c={t} />
              {t.selected_text && (
                <p className="mb-1 line-clamp-2 border-l-2 pl-2 text-xs italic text-muted-foreground">
                  “{t.selected_text}”
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm">{t.body}</p>
            </button>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {t.page_number && <span>p.{t.page_number}</span>}
              {t.resolved && <Badge variant="outline" className="text-[10px]">Resolved</Badge>}
              {t.version_id !== viewedVersionId && (
                <Link href={`${pathname}?v=${t.version_id}`} className="underline">
                  Made on v{t.version_number} · view
                </Link>
              )}
            </div>

            {t.replies.length > 0 && (
              <ul className="mt-2 space-y-2 border-l pl-3">
                {t.replies.map((r) => (
                  <li key={r.id}>
                    <Author c={r} />
                    <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && (
              <div className="mt-1 flex items-center gap-1">
                <ReplyBox documentId={documentId} parentId={t.id} />
                <Button variant="ghost" size="sm" onClick={() => toggleResolved(t)}>
                  {t.resolved ? 'Reopen' : 'Resolve'}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}