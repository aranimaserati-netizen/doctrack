'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { customerSetStatus } from '@/lib/actions/review'
import { uploadVersion, restoreVersion, markFinal } from '@/lib/actions/versions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_BYTES = 25 * 1024 * 1024

type Props = {
  documentId: string
  orgId: string
  role: 'business' | 'customer'
  status: string
  isLive: boolean          // viewing the latest version, not a historical point
  canRestore: boolean      // viewing an older version
  viewedVersionId: string
  viewedVersionNumber: number
  nextVersion: number
}

export function DocumentActions(p: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<null | 'changes' | 'upload'>(null)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  if (p.status === 'final') return null

  async function run(fn: () => Promise<{ error?: string }>, success: string) {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(success)
    setMode(null)
    setMessage('')
    setNote('')
    setFile(null)
    router.refresh()
  }

  async function submitNewVersion() {
    if (!file) return toast.error('Choose a PDF file.')
    if (!note.trim()) return toast.error('Add a note describing what changed.')
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are allowed.')
    if (file.size > MAX_BYTES) return toast.error('File is larger than 25 MB.')

    setBusy(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    // Random suffix so a retry after a failed attempt never collides with an orphan file
    const path = `${p.orgId}/${p.documentId}/v${p.nextVersion}_${crypto.randomUUID().slice(0, 8)}_${safe}`

    const supabase = createClient()
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (upErr) {
      setBusy(false)
      return toast.error('Upload failed: ' + upErr.message)
    }

    const res = await uploadVersion({
      documentId: p.documentId,
      filePath: path,
      fileName: file.name,
      note,
    })
    setBusy(false)
    if (res.error) return toast.error(res.error)

    toast.success(`v${p.nextVersion} uploaded`)
    setMode(null)
    setNote('')
    setFile(null)
    router.refresh()
  }

  /* ---------------- Customer ---------------- */
  if (p.role === 'customer') {
    if (!p.isLive) return null
    const canApprove = ['uploaded', 'in_review', 'revised'].includes(p.status)
    const canRequest = canApprove || p.status === 'approved'

    return (
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <Button
              disabled={busy}
              onClick={() =>
                confirm('Approve this version?') &&
                run(() => customerSetStatus(p.documentId, 'approve'), 'Version approved')
              }
            >
              Approve
            </Button>
          )}
          {canRequest && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setMode(mode === 'changes' ? null : 'changes')}
            >
              Request changes
            </Button>
          )}
          {p.status === 'changes_requested' && (
            <p className="text-sm text-muted-foreground">
              Changes requested. Waiting for the business to upload a revision.
            </p>
          )}
          {p.status === 'approved' && (
            <p className="text-sm text-muted-foreground">
              You approved this version. Waiting for the business to finalize it.
            </p>
          )}
        </div>

        {mode === 'changes' && (
          <div className="space-y-2">
            <Label htmlFor="msg">Summary of the changes you need (optional)</Label>
            <Textarea
              id="msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please revise clause 4 and the payment terms."
            />
            <Button
              disabled={busy}
              onClick={() =>
                run(() => customerSetStatus(p.documentId, 'request_changes', message), 'Changes requested')
              }
            >
              Send request
            </Button>
          </div>
        )}
      </div>
    )
  }

  /* ---------------- Business: viewing an older point in time ---------------- */
  if (!p.isLive) {
    if (!p.canRestore) return null
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
        <Button
          disabled={busy}
          onClick={() =>
            confirm(`Restore v${p.viewedVersionNumber} as a new version? Nothing is deleted.`) &&
            run(
              () => restoreVersion({ documentId: p.documentId, versionId: p.viewedVersionId }),
              'Restored as a new version'
            )
          }
        >
          Restore v{p.viewedVersionNumber} as new version
        </Button>
        <p className="text-sm text-muted-foreground">
          Creates v{p.nextVersion} from this file. All history stays intact.
        </p>
      </div>
    )
  }

  /* ---------------- Business: latest version ---------------- */
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={() => setMode(mode === 'upload' ? null : 'upload')}>
          Upload new version
        </Button>
        {p.status === 'approved' && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              confirm(
                `Mark v${p.viewedVersionNumber} as the FINAL version? This locks the document: no more comments or versions.`
              ) && run(() => markFinal(p.documentId), 'Document marked as final')
            }
          >
            Mark as final
          </Button>
        )}
        {p.status === 'changes_requested' && (
          <p className="text-sm text-muted-foreground">
            The customer requested changes. Upload a revised version.
          </p>
        )}
        {p.status === 'approved' && (
          <p className="text-sm text-muted-foreground">Approved by the customer.</p>
        )}
      </div>

      {mode === 'upload' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="vfile">PDF file for v{p.nextVersion} (max 25 MB)</Label>
            <Input
              id="vfile"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vnote">What changed? (required)</Label>
            <Textarea
              id="vnote"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Updated clause 4 per customer comment"
            />
          </div>
          <Button disabled={busy} onClick={submitNewVersion}>
            {busy ? 'Uploading…' : `Upload v${p.nextVersion}`}
          </Button>
        </div>
      )}
    </div>
  )
}