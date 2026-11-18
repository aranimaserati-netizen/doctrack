import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DEV ONLY. Delete this file before going to production.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }
  const supabase = await createClient()
  const orgA = 'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-00000000000a/v1_sample.pdf'
  const orgB = 'b0000000-0000-0000-0000-000000000002/d0000000-0000-0000-0000-00000000000b/v1_sample.pdf'

  const a = await supabase.storage.from('documents').createSignedUrl(orgA, 60)
  const b = await supabase.storage.from('documents').createSignedUrl(orgB, 60)

  return NextResponse.json({
    orgA_file: a.error ? `BLOCKED: ${a.error.message}` : 'ALLOWED',
    orgB_file: b.error ? `BLOCKED: ${b.error.message}` : 'ALLOWED',
  })
}