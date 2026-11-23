'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createDocument } from '@/lib/actions/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/loading-button'

const MAX_BYTES = 25 * 1024 * 1024

export function NewDocumentForm({
  orgs,
  defaultOrg,
}: {
  orgs: { id: string; name: string }[]
  defaultOrg?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const orgId = String(fd.get('org'))
    const title = String(fd.get('title')).trim()
    const note = String(fd.get('note') ?? '')
    const file = fd.get('file') as File | null

    if (!orgId || !title || !file || file.size === 0) return toast.error('Fill in all required fields.')
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are allowed.')
    if (file.size > MAX_BYTES) return toast.error('File is larger than 25 MB.')

    setBusy(true)
    const docId = crypto.randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${orgId}/${docId}/v1_${safeName}`

    // 1. Upload straight to private storage (storage RLS applies)
    const supabase = createClient()
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (upErr) {
      setBusy(false)
      return toast.error('Upload failed: ' + upErr.message)
    }

    // 2. Record document + version + event (one transaction in the database)
    const res = await createDocument({ docId, orgId, title, filePath: path, fileName: file.name, note })
    if (res.error) {
      setBusy(false)
      return toast.error(res.error)
    }

    toast.success('Document uploaded')
    router.push(`/business/documents/${docId}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org">Dealer</Label>
        <select
          id="org"
          name="org"
          required
          defaultValue={defaultOrg ?? ''}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="" disabled>Select a dealer</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Document title</Label>
        <Input id="title" name="title" required maxLength={200} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">PDF file (max 25 MB)</Label>
        <Input id="file" name="file" type="file" accept="application/pdf" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="Initial upload" />
      </div>
      <LoadingButton type="submit" loading={busy} className="h-11 w-full text-base">
       {busy ? 'Uploading… please keep this page open' : 'Upload'}
      </LoadingButton>
    </form>
  )
}