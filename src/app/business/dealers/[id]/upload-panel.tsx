'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createDocument } from '@/lib/actions/documents'
import { CATEGORY_LABEL, type Category } from '@/lib/categories'
import { LoadingButton } from '@/components/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MAX_BYTES = 25 * 1024 * 1024

export function UploadPanel({ orgId, category }: { orgId: string; category: Category }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget // keep a reference: currentTarget is null after an await
    const fd = new FormData(form)
    const title = String(fd.get('title')).trim()
    const file = fd.get('file') as File | null

    if (!title || !file || file.size === 0) return toast.error('Enter a title and choose a file.')
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are allowed for now.')
    if (file.size > MAX_BYTES) return toast.error('File is larger than 25 MB.')

    setBusy(true)
    const docId = crypto.randomUUID()
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${orgId}/${docId}/v1_${safe}`

    const { error: upErr } = await createClient()
      .storage.from('documents')
      .upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (upErr) {
      setBusy(false)
      return toast.error('Upload failed: ' + upErr.message)
    }

    const res = await createDocument({ docId, orgId, title, category, filePath: path, fileName: file.name })
    setBusy(false)
    if (res.error) return toast.error(res.error)

    toast.success('Document uploaded')
    form.reset()
    router.refresh()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-lg border-2 border-dashed border-[#7CA6BC] bg-white/60 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end"
    >
      <div className="space-y-2">
        <Label htmlFor="title">{CATEGORY_LABEL[category]} document title</Label>
        <Input id="title" name="title" required maxLength={200} disabled={busy} className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">PDF file (max 25 MB)</Label>
        <Input id="file" name="file" type="file" accept="application/pdf" required disabled={busy} className="bg-white" />
      </div>
      <LoadingButton type="submit" loading={busy} className="h-10 bg-[#2F3556] hover:bg-[#3a4166]">
        {!busy && <Upload className="mr-2 h-4 w-4" />}
        {busy ? 'Uploading…' : `Upload to ${CATEGORY_LABEL[category]}`}
      </LoadingButton>
    </form>
  )
}