'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createDocument } from '@/lib/actions/documents'
import { CATEGORY_LABEL, type Category } from '@/lib/categories'
import { LoadingButton } from '@/components/loading-button'

const MAX_BYTES = 25 * 1024 * 1024

export function UploadPanel({ orgId, orgName, category }: { orgId: string; orgName: string; category: Category }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be chosen again after an error
    if (!file) return
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are allowed.')
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

    const res = await createDocument({
      docId,
      orgId,
      title: `${orgName} – ${CATEGORY_LABEL[category]}`,
      category,
      filePath: path,
      fileName: file.name,
    })
    setBusy(false)
    if (res.error) {
      return toast.error(
        res.error.includes('one_document_per_slot') || res.error.includes('duplicate')
          ? `This dealer already has a ${CATEGORY_LABEL[category]} document.`
          : res.error
      )
    }
    toast.success(`${CATEGORY_LABEL[category]} document uploaded`)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[#7CA6BC] bg-white/70 px-4 py-8 text-center">
      <p className="text-sm text-[#2F3556]/70">No {CATEGORY_LABEL[category]} document yet.</p>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
      <LoadingButton loading={busy} className="bg-[#2F3556] hover:bg-[#3a4166]" onClick={() => input.current?.click()}>
        {!busy && <Upload className="mr-2 h-4 w-4" />}
        {busy ? 'Uploading…' : `Upload ${CATEGORY_LABEL[category]} PDF`}
      </LoadingButton>
    </div>
  )
}