'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { LocalTime } from '@/components/local-time'
import type { TimelineEntry, VersionRow } from '@/lib/types'

function describe(e: TimelineEntry): string {
  const m = e.metadata ?? {}
  switch (e.type) {
    case 'version_uploaded':
      return `uploaded v${m.version_number}${m.note ? `: “${m.note}”` : ''}`
    case 'version_restored':
      return `restored an earlier version as v${m.version_number}`
    case 'comment_added':
      return `commented${m.page_number ? ` on page ${m.page_number}` : ''}: “${m.excerpt ?? ''}”`
    case 'reply_added':
      return `replied: “${m.excerpt ?? ''}”`
    case 'comment_resolved':
      return `resolved a comment: “${m.excerpt ?? ''}”`
    case 'comment_reopened':
      return `reopened a comment: “${m.excerpt ?? ''}”`
    case 'status_changed':
      if (m.to === 'final') return 'marked this version as FINAL and locked the document'
      if (m.to === 'approved') return 'approved this version'
      if (m.to === 'changes_requested')
        return `requested changes${m.message ? `: “${m.message}”` : ''}`
      if (m.to === 'revised' && m.no_file_change)
        return `marked the document as revised with no file changes: “${m.note ?? ''}”`
      return `status changed to ${String(m.to).replaceAll('_', ' ')}`
    default:
      return e.type
  }
}

export function Timeline({
  entries,
  versions,
  currentVersionId,
  viewedVersionId,
  activeAt,
}: {
  entries: TimelineEntry[]
  versions: VersionRow[]
  currentVersionId: string
  viewedVersionId: string
  activeAt: string | null
}) {
  const pathname = usePathname()
  const activeMs = activeAt ? Date.parse(activeAt) : null

  return (
    <div>
      <div className="border-b p-3 text-sm font-medium">Versions</div>
      <ul className="divide-y border-b">
        {[...versions].reverse().map((v) => (
          <li key={v.id}>
            <Link
              href={v.id === currentVersionId ? pathname : `${pathname}?v=${v.id}`}
              className={`block p-3 hover:bg-muted/50 ${
                v.id === viewedVersionId && !activeAt ? 'bg-muted/60' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">v{v.version_number}</span>
                {v.id === currentVersionId && <Badge className="text-[10px]">Current</Badge>}
                {v.restored_from_version_id && (
                  <Badge variant="outline" className="text-[10px]">Restored</Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  <LocalTime iso={v.created_at} />
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {v.uploader?.full_name} · {v.note}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-b p-3 text-sm font-medium">History (newest first)</div>
      <ul className="divide-y">
        {entries.map((e) => {
          const isActive = activeMs !== null && Date.parse(e.created_at) === activeMs
          const body = (
            <>
              <p className="text-sm">
                <span className="font-medium">{e.actor_name}</span>{' '}
                {e.actor_role && (
                  <Badge variant="secondary" className="mr-1 text-[10px] capitalize">
                    {e.actor_role}
                  </Badge>
                )}
                {describe(e)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <LocalTime iso={e.created_at} />
                {e.version_number && ` · on v${e.version_number}`}
              </p>
            </>
          )
          return (
            <li key={e.id} className={isActive ? 'bg-yellow-50 dark:bg-yellow-950/30' : ''}>
              {e.version_id ? (
                <Link
                  href={`${pathname}?v=${e.version_id}&at=${encodeURIComponent(e.created_at)}`}
                  className="block p-3 hover:bg-muted/50"
                >
                  {body}
                </Link>
              ) : (
                <div className="p-3">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}