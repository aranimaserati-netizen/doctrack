'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { notifyDocumentEvent } from '@/lib/email/notify'

export async function uploadVersion(input: {
  documentId: string
  filePath: string
  fileName: string
  note?: string
}): Promise<{ error?: string }> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const { error } = await supabase.rpc('upload_version', {
    p_doc_id: input.documentId,
    p_file_path: input.filePath,
    p_file_name: input.fileName,
    p_note: input.note?.trim().slice(0, 1000) || null,
  })
  if (error) return { error: error.message }

  await notifyDocumentEvent({
    documentId: input.documentId,
    kind: 'new_version',
    actorName: profile.full_name ?? profile.email ?? 'Someone',
  })
  revalidatePath(`/business/documents/${input.documentId}`)
  revalidatePath(`/portal/documents/${input.documentId}`)
  revalidatePath('/portal')
  return {}
}