import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // RLS: returns null if this user cannot see the version
  const { data: v } = await supabase
    .from('document_versions')
    .select('file_path, file_name')
    .eq('id', id)
    .maybeSingle()
  if (!v) return new NextResponse('Not found', { status: 404 })

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(v.file_path, 60, { download: v.file_name ?? true })
  if (error || !data) return new NextResponse('Not found', { status: 404 })

  return NextResponse.redirect(data.signedUrl)
}