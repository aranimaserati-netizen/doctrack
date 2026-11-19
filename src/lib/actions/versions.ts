'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'

type Result = { error?: string }

function refresh(documentId: string) {
  revalidatePath(`/business/documents/${documentId}`)
  revalidatePath(`/portal/documents/${documentId}`)
  revalidatePath('/business')
  revalidatePath('/portal')
}

export async function uploadVersion(input: {
  documentId: string
  filePath: string
  fileName: string
  note: string
}): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const note = input.note.trim()
  if (!note) return { error: 'A note describing the change is required.' }
  if (note.length > 1000) return { error: 'Note is too long (max 1000 characters).' }

  const { error } = await supabase.rpc('upload_version', {
    p_doc_id: input.documentId,
    p_file_path: input.filePath,
    p_file_name: input.fileName,
    p_note: note,
  })
  if (error) return { error: error.message }

  refresh(input.documentId)
  return {}
}

export async function restoreVersion(input: {
  documentId: string
  versionId: string
  note?: string
}): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const { error } = await supabase.rpc('restore_version', {
    p_doc_id: input.documentId,
    p_version_id: input.versionId,
    p_note: input.note?.trim() || null,
  })
  if (error) return { error: error.message }

  refresh(input.documentId)
  return {}
}

export async function markFinal(documentId: string): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const { error } = await supabase.rpc('mark_final', { p_doc_id: documentId })
  if (error) return { error: error.message }

  refresh(documentId)
  return {}
}
export async function markRevisedNoChanges(input: {
  documentId: string
  note: string
}): Promise<Result> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const note = input.note.trim()
  if (!note) return { error: 'Please explain why no changes were made.' }
  if (note.length > 1000) return { error: 'Explanation is too long (max 1000 characters).' }

  const { error } = await supabase.rpc('mark_revised_no_changes', {
    p_doc_id: input.documentId,
    p_note: note,
  })
  if (error) return { error: error.message }

  refresh(input.documentId)
  return {}
}