'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { notifyDocumentEvent } from '@/lib/email/notify'

type Input = {
  documentId: string
  versionId: string
  body: string
  pageNumber: number
  selectedText: string
  position: { rects: { x: number; y: number; w: number; h: number }[] }
}

export async function addComment(input: Input): Promise<{ error?: string }> {
  const { supabase, profile } = await requireProfile()

  const body = input.body.trim()
  if (!body || body.length > 5000) return { error: 'Comment must be 1-5000 characters.' }
  if (!Number.isInteger(input.pageNumber) || input.pageNumber < 1) return { error: 'Invalid page.' }

  const rects = input.position?.rects
  const validRects =
    Array.isArray(rects) &&
    rects.length > 0 &&
    rects.length <= 200 &&
    rects.every((r) => [r.x, r.y, r.w, r.h].every((v) => typeof v === 'number' && Number.isFinite(v)))
  if (!validRects) return { error: 'Invalid highlight.' }

  const { error } = await supabase.from('comments').insert({
    document_id: input.documentId,
    version_id: input.versionId,
    author_id: profile.id,
    body,
    page_number: input.pageNumber,
    selected_text: input.selectedText.slice(0, 1000),
    position: { rects },
  })
  if (error) return { error: error.message }

  // NEW: email the other side (if they opted in)
  await notifyDocumentEvent({
    documentId: input.documentId,
    kind: 'comment',
    actorName: profile.full_name ?? profile.email ?? 'Someone',
  })

  revalidatePath(`/portal/documents/${input.documentId}`)
  revalidatePath(`/business/documents/${input.documentId}`)
  return {}
}