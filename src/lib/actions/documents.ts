'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'

type Input = {
  docId: string
  orgId: string
  title: string
  filePath: string
  fileName: string
  note?: string
}

export async function createDocument(input: Input): Promise<{ id?: string; error?: string }> {
  const { supabase, profile } = await requireProfile()
  if (profile.role !== 'business') return { error: 'Not allowed.' }

  const title = input.title.trim()
  if (!title || title.length > 200) return { error: 'Title must be 1-200 characters.' }

  const { error } = await supabase.rpc('create_document', {
    p_doc_id: input.docId,
    p_org_id: input.orgId,
    p_title: title,
    p_file_path: input.filePath,
    p_file_name: input.fileName,
    p_note: input.note?.trim() || 'Initial upload',
  })
  if (error) return { error: error.message }

  revalidatePath('/business')
  return { id: input.docId }
}