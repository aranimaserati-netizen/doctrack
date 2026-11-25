'use client'

import { LocalTime } from '@/components/local-time'
import type { TimelineEntry } from '@/lib/types'

function describe(e: TimelineEntry): string {
  const m = e.metadata ?? {}
  switch (e.type) {
    case 'version_uploaded':
      return 'uploaded the document'
    case 'comment_added':
      return `commented: “${m.excerpt ?? ''}”`
    case 'reply_added':
      return `replied: “${m.excerpt ?? ''}”`
    case 'comment_resolved':
      return `resolved a comment: “${m.excerpt ?? ''}”`
    case 'comment_reopened':
      return `reopened a comment: “${m.excerpt ?? ''}”`
    case 'status_changed':
      if (m.to === 'final') return 'marked the document as FINAL and locked it'
      if (m.to === 'approved') return 'approved the document'
      return `changed the status to ${String(m.to).replaceAll('_', ' ')}`
    default:
      return e.type.replaceAll('_', ' ')
  }
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div>
      <div className="border-b border-[#BFCBD0] p-3 text-sm font-semibold text-[#2F3556]">Activity (newest first)</div>
      <ul className="divide-y divide-[#BFCBD0]/60">
        {entries.map((e) => (
          <li key={e.id} className="p-3 text-[#2F3556]">
            <p className="text-sm">
              <span className="font-bold">{e.actor_name}</span> {describe(e)}
            </p>
            <p className="mt-0.5 text-xs text-[#2F3556]/50">
              <LocalTime iso={e.created_at} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}