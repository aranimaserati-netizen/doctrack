export type Rect = { x: number; y: number; w: number; h: number } // % of the page

export type Author = { full_name: string | null; role: 'business' | 'customer' } | null

export type CommentRow = {
  id: string
  version_id: string
  parent_id: string | null
  body: string
  page_number: number | null
  selected_text: string | null
  position: { rects: Rect[] } | null
  resolved: boolean
  created_at: string
  author: Author
}

export type Thread = CommentRow & {
  version_number: number
  replies: CommentRow[]
}

export type VersionRow = {
  id: string
  version_number: number
  file_path: string
  file_name: string | null
  note: string | null
  created_at: string
  restored_from_version_id: string | null
  uploader: { full_name: string | null } | null
}

export type TimelineEntry = {
  id: string
  type: string
  created_at: string
  version_id: string | null
  version_number: number | null
  actor_name: string
  actor_role: 'business' | 'customer' | null
  metadata: Record<string, any>
}

export type Draft = {
  pageNumber: number
  selectedText: string
  rects: Rect[]
  anchor: { left: number; top: number }
}