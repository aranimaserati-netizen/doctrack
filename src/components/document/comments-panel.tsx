'use client'

import { Badge } from '@/components/ui/badge'
import type { CommentRow } from '@/lib/types'

export function CommentsPanel({
  comments,
  activeId,
  onSelect,
}: {
  comments: CommentRow[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <aside className="rounded-md border lg:h-[78vh] lg:overflow-auto">
      <div className="border-b p-3 text-sm font-medium">Comments ({comments.length})</div>
      {comments.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">
          Select text in the document to add the first comment.
        </p>
      )}
      <ul className="divide-y">
        {comments.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`block w-full p-3 text-left transition-colors hover:bg-muted/50 ${
                activeId === c.id ? 'bg-yellow-50 dark:bg-yellow-950/30' : ''
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium">{c.author?.full_name ?? 'Unknown'}</span>
                {c.author && (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {c.author.role}
                  </Badge>
                )}
                {c.page_number && (
                  <span className="ml-auto text-xs text-muted-foreground">p.{c.page_number}</span>
                )}
              </div>
              {c.selected_text && (
                <p className="mb-1 line-clamp-2 border-l-2 pl-2 text-xs italic text-muted-foreground">
                  “{c.selected_text}”
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              <time className="mt-1 block text-xs text-muted-foreground" suppressHydrationWarning>
                {new Date(c.created_at).toLocaleString()}
              </time>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}