'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Reply as ReplyIcon, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/loading-button'
import { Textarea } from '@/components/ui/textarea'
import { replyToComment, setCommentResolved } from '@/lib/actions/review'
import type { CommentRow, Thread } from '@/lib/types'

const nameColor: Record<string, string> = {
  business: 'text-[#4A6FA0]',
  customer: 'text-[#9A4F63]',
}

function Author({ c }: { c: CommentRow }) {
  const role = c.author?.role ?? ''
  return (
    <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
      <span className={`text-sm font-bold ${nameColor[role] ?? 'text-[#2F3556]'}`}>
        {c.author?.full_name ?? 'Unknown'}
      </span>
      {role && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-[#2F3556]/50">
          {role}
        </span>
      )}
      <time className="ml-auto text-xs text-[#2F3556]/50" suppressHydrationWarning>
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
      <Button
        size="sm"
        variant="outline"
        className="border-[#3B7DB5] bg-white/80 text-[#3B7DB5] transition-colors hover:!border-[#3B7DB5] hover:!bg-[#3B7DB5] hover:!text-white"
        onClick={() => setOpen(true)}
      >
        <ReplyIcon className="mr-1 h-4 w-4" /> Reply
      </Button>
    )
  }
  return (
    <div className="mt-2 w-full space-y-2">
      <Textarea
        autoFocus
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        className="bg-white"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton
          size="sm"
          className="bg-[#2F3556] text-white hover:bg-[#3a4166]"
          loading={busy}
          disabled={!body.trim()}
          onClick={send}
        >
          {busy ? 'Sending…' : 'Send reply'}
        </LoadingButton>
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
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggleResolved(t: Thread) {
    setBusyId(t.id)
    const res = await setCommentResolved(documentId, t.id, !t.resolved)
    setBusyId(null)
    if (res.error) return toast.error(res.error)
    router.refresh()
  }

  const shown = hideResolved ? threads.filter((t) => !t.resolved) : threads
  const openCount = threads.filter((t) => !t.resolved).length
  const resolvedCount = threads.length - openCount

  return (
    <div className="text-[#2F3556]">
      <div className="flex items-center justify-between border-b border-[#BFCBD0] p-3 text-sm">
        <span className="font-semibold">
          Comments ({threads.length}) ·{' '}
          <span className="text-[#4A6FA0]">{openCount} open</span> ·{' '}
          <span className="text-[#5E8A74]">{resolvedCount} resolved</span>
        </span>
        <button
          type="button"
          className="text-xs text-[#2F3556]/60 underline"
          onClick={() => setHideResolved((v) => !v)}
        >
          {hideResolved ? 'Show resolved' : 'Hide resolved'}
        </button>
      </div>

      {shown.length === 0 && (
        <p className="p-4 text-sm text-[#2F3556]/60">
          {readOnly
            ? 'No comments at this point in time.'
            : 'Select text in the document to add the first comment.'}
        </p>
      )}

      <ul className="space-y-3 p-3">
        {shown.map((t) => (
          <li
            key={t.id}
            className={`rounded-lg border border-l-4 p-3 shadow-sm ${
              t.resolved
                ? 'border-[#C5E0A8] border-l-[#7FB55A] bg-[#EAF5DD]'
                : 'border-[#BFCBD0] border-l-[#2F3556] bg-[#F1F4F6]'
            } ${activeId === t.id ? 'ring-2 ring-[#7CA6BC] ring-offset-1' : ''}`}
          >
            {t.resolved && (
              <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#5E8A74]">
                <CheckCircle2 className="h-4 w-4" /> Resolved
              </div>
            )}

            <button type="button" onClick={() => onSelect(t.id)} className="block w-full text-left">
              <Author c={t} />
              {t.selected_text && (
                <p className="mb-1 line-clamp-2 border-l-2 border-[#7CA6BC] pl-2 text-xs italic text-[#2F3556]/60">
                  “{t.selected_text}”
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm">{t.body}</p>
            </button>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#2F3556]/50">
              {t.page_number && <span>Page {t.page_number}</span>}
              {t.version_id !== viewedVersionId && (
                <Link href={`${pathname}?v=${t.version_id}`} className="underline">
                  Made on version {t.version_number} · view
                </Link>
              )}
            </div>

            {t.replies.length > 0 && (
              <ul className="mt-3 space-y-2">
                {t.replies.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-[#7CA6BC]/40 border-l-4 border-l-[#7CA6BC] bg-[#7CA6BC]/15 p-2.5"
                  >
                    <Author c={r} />
                    <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ReplyBox documentId={documentId} parentId={t.id} />
                {t.resolved ? (
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    className="border-[#E08A2E] bg-white/80 text-[#C46F14] transition-colors hover:!border-[#E08A2E] hover:!bg-[#E08A2E] hover:!text-white"
                    loading={busyId === t.id}
                    onClick={() => toggleResolved(t)}
                  >
                    {busyId !== t.id && <RotateCcw className="mr-1 h-4 w-4" />} Reopen
                  </LoadingButton>
                ) : (
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    className="border-[#5FA044] bg-white/80 text-[#4A8A32] transition-colors hover:!border-[#5FA044] hover:!bg-[#5FA044] hover:!text-white"
                    loading={busyId === t.id}
                    onClick={() => toggleResolved(t)}
                  >
                    {busyId !== t.id && <CheckCircle2 className="mr-1 h-4 w-4" />} Resolve
                  </LoadingButton>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}