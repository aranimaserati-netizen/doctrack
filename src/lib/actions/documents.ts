'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { notifyDocumentEvent } from '@/lib/email/notify'
import type { Category } from '@/lib/categories'

export async function createDocument(input: {
  docId: string
  orgId: string
  title: string
  category: Category
  filePath: string
  fileName: string
}): Promise<{ id?: string; error?: string }> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const title = input.title.trim()
  if (!title || title.length > 200) return { error: 'Title must be 1-200 characters.' }
  if (input.category !== 'sales' && input.category !== 'after_sales') return { error: 'Invalid category.' }

  const { error } = await supabase.rpc('create_document', {
    p_doc_id: input.docId,
    p_org_id: input.orgId,
    p_title: title,
    p_category: input.category,
    p_file_path: input.filePath,
    p_file_name: input.fileName,
  })
  if (error) return { error: error.message }

  await notifyDocumentEvent({
    documentId: input.docId,
    kind: 'new_document',
    actorName: profile.full_name ?? profile.email ?? 'Someone',
  })

  revalidatePath('/business')
  revalidatePath(`/business/dealers/${input.orgId}`)
  revalidatePath('/portal')
  return { id: input.docId }
}