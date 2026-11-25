'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { notifyDocumentEvent } from '@/lib/email/notify'

type Result = { error?: string }

function refresh(documentId: string) {
  revalidatePath(`/portal/documents/${documentId}`)
  revalidatePath(`/business/documents/${documentId}`)
  revalidatePath('/portal')
  revalidatePath('/business')
}

export async function replyToComment(input: {
  documentId: string
  parentId: string
  body: string
}): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  const body = input.body.trim()
  if (!body || body.length > 5000) return { error: 'Reply must be 1-5000 characters.' }

  const { data: doc } = await supabase
    .from('documents')
    .select('current_version_id')
    .eq('id', input.documentId)
    .maybeSingle()
  if (!doc?.current_version_id) return { error: 'Document not found.' }

  const { error } = await supabase.from('comments').insert({
    document_id: input.documentId,
    version_id: doc.current_version_id,
    parent_id: input.parentId,
    author_id: profile.id,
    body,
  })
  if (error) return { error: error.message }

  await notifyDocumentEvent({
    documentId: input.documentId,
    kind: 'reply',
    actorName: profile.full_name ?? profile.email ?? 'Someone',
  })
  refresh(input.documentId)
  return {}
}

export async function setCommentResolved(documentId: string, commentId: string, resolved: boolean): Promise<Result> {
  const { supabase } = await requireProfile()
  const { error } = await supabase.rpc('set_comment_resolved', { p_comment_id: commentId, p_resolved: resolved })
  if (error) return { error: error.message }
  refresh(documentId)
  return {}
}

export async function approveDocument(documentId: string): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  const { error } = await supabase.rpc('customer_approve', { p_doc_id: documentId })
  if (error) return { error: error.message }
  await notifyDocumentEvent({
    documentId,
    kind: 'approved',
    actorName: profile.full_name ?? profile.email ?? 'Someone',
  })
  refresh(documentId)
  return {}
}

export async function markFinal(documentId: string): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }
  const { error } = await supabase.rpc('mark_final', { p_doc_id: documentId })
  if (error) return { error: error.message }
  await notifyDocumentEvent({
    documentId,
    kind: 'final',
    actorName: profile.full_name ?? profile.email ?? 'Someone',
  })
  refresh(documentId)
  return {}
}