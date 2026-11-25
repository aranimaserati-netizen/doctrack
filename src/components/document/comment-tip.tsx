'use client'

import { useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'

export function CommentTip() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div
      role="status"
      className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#7CA6BC] bg-[#2F3556] py-2 pl-4 pr-2 text-sm text-white shadow-lg"
    >
      <MousePointerClick className="h-4 w-4 shrink-0" />
      <span>Tap on document text to comment</span>
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={() => setOpen(false)}
        className="rounded-full p-1 text-white/70 transition hover:bg-white/15 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}