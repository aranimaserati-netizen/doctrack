export type Rect = { x: number; y: number; w: number; h: number } // percentages (0-100) of the page

export type CommentRow = {
  id: string
  version_id: string
  body: string
  page_number: number | null
  selected_text: string | null
  position: { rects: Rect[] } | null
  resolved: boolean
  created_at: string
  author: { full_name: string | null; role: 'business' | 'customer' } | null
}

export type Draft = {
  pageNumber: number
  selectedText: string
  rects: Rect[]
  anchor: { left: number; top: number } // px, relative to the viewer content box
}