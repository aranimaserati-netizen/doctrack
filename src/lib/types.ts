export type Rect = { x: number; y: number; w: number; h: number } // % of the page

export type Author = { full_name: string | null; role: 'business' | 'customer' } | null

export type CommentRow = {
  id: string
  parent_id: string | null
  body: string
  page_number: number | null
  selected_text: string | null
  position: { rects: Rect[] } | null
  resolved: boolean
  created_at: string
  author: Author
}

export type Thread = CommentRow & { replies: CommentRow[] }

export type TimelineEntry = {
  id: string
  type: string
  created_at: string
  actor_name: string
  metadata: Record<string, any>
}

export type Draft = {
  pageNumber: number
  selectedText: string
  rects: Rect[]
  anchor: { left: number; top: number }
}