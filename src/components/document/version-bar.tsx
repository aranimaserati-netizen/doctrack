'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadVersion } from '@/lib/actions/versions'
import { LoadingButton } from '@/components/loading-button'
import { Input } from '@/components/ui/input'

type V = { id: string; version_number: number; created_at: string }

export function VersionBar({
  versions, currentId, viewedId, canUpload, orgId, documentId, nextVersion,
}: {
  versions: V[]
  currentId: string
  viewedId: string
  canUpload: boolean
  orgId: string
  documentId: string
  nextVersion: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const input = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are allowed.')
    if (file.size > 25 * 1024 * 1024) return toast.error('File is larger than 25 MB.')

    setBusy(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    // Random part means a retry never collides with a leftover file
    const path = `${orgId}/${documentId}/v${nextVersion}_${crypto.randomUUID().slice(0, 8)}_${safe}`
    const { error: upErr } = await createClient()
      .storage.from('documents')
      .upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (upErr) {
      setBusy(false)
      return toast.error('Upload failed: ' + upErr.message)
    }
    const res = await uploadVersion({ documentId, filePath: path, fileName: file.name, note })
    setBusy(false)
    if (res.error) return toast.error(res.error)
    toast.success(`Version ${nextVersion} uploaded`)
    setNote('')
    router.push(pathname) // back to the latest version
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#BFCBD0] bg-white/70 p-3 text-[#2F3556]">
      {/* <span className="text-sm font-semibold">Versions</span> */}
      <div className="flex flex-wrap gap-2">
        {[...versions].reverse().map((v) => {
          const isCurrent = v.id === currentId
          const active = v.id === viewedId
          return (
            <Link
              key={v.id}
              href={isCurrent ? pathname : `${pathname}?v=${v.id}`}
              title={new Date(v.created_at).toLocaleString()}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'border-[#2F3556] bg-[#2F3556] text-white'
                  : 'border-[#BFCBD0] bg-white hover:bg-[#EEF1F4]'
              }`}
            >
              version {v.version_number}
              {isCurrent && <span className="ml-1 text-xs opacity-70">(latest)</span>}
            </Link>
          )
        })}
      </div>

      {canUpload && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What changed? (optional)"
            maxLength={200}
            disabled={busy}
            className="h-9 w-56 bg-white"
          /> */}
          <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
          <LoadingButton loading={busy} className="bg-[#2F3556] hover:bg-[#3a4166]" onClick={() => input.current?.click()}>
            {!busy && <Upload className="mr-2 h-4 w-4" />}
            {/* {busy ? 'Uploading…' : `Upload v${nextVersion}`} */}
            {busy ? 'Uploading…' : `Upload New Version`}
          </LoadingButton>
        </div>
      )}
    </div>
  )
}